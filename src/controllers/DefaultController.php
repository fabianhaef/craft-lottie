<?php

namespace vu\craftlottie\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;

/**
 * Default controller for the Craft Lottie plugin
 */
class DefaultController extends Controller
{
    /**
     * @var array<int|string>|bool|int Whether to allow anonymous access
     */
    protected array|bool|int $allowAnonymous = ['get-asset-json'];

    /**
     * Main index action - List all Lottie files
     */
    public function actionIndex(): Response
    {
        $plugin = \vu\craftlottie\Plugin::getInstance();
        $settings = $plugin->getSettings();
        
        // Get configured volume ID
        $volumeId = $settings->lottieVolumeId ?? null;
        
        // Build asset query - include both JSON and .lottie files
        $assetQuery = \craft\elements\Asset::find()
            ->orderBy(['dateCreated' => SORT_DESC]);
        
        // Filter by file extension (JSON or .lottie)
        // Use raw SQL for filename pattern matching
        $db = Craft::$app->getDb();
        $assetQuery->andWhere([
            'or',
            ['like', 'filename', '%.json', false],
            ['like', 'filename', '%.lottie', false]
        ]);
        
        // Filter by volume if configured
        if ($volumeId && $volumeId > 0) {
            $assetQuery->volumeId($volumeId);
        }
        
        $lottieAssets = $assetQuery->all();
        
        // Get the configured volume
        $primaryVolume = null;
        if ($volumeId && $volumeId > 0) {
            $primaryVolume = Craft::$app->getVolumes()->getVolumeById($volumeId);
        }

        return $this->renderTemplate('craft-lottie/index', [
            'title' => 'Lottie Animator',
            'lottieAssets' => $lottieAssets,
            'configuredVolumeId' => $volumeId,
            'primaryVolume' => $primaryVolume,
        ]);
    }

    /**
     * Edit a specific Lottie animation
     */
    public function actionEdit(int $assetId): Response
    {
        $asset = Craft::$app->getAssets()->getAssetById($assetId);

        if (!$asset) {
            throw new \yii\web\NotFoundHttpException('Asset not found');
        }

        $plugin = \vu\craftlottie\Plugin::getInstance();
        $settings = $plugin->getSettings();
        
        return $this->renderTemplate('craft-lottie/edit', [
            'asset' => $asset,
            'title' => 'Edit: ' . $asset->filename,
            'brandPalette' => $settings->brandPalette ?? [],
        ]);
    }

    /**
     * Get asset JSON content directly
     */
    public function actionGetAssetJson(int $assetId = null): Response
    {
        if (!$assetId) {
            $assetId = Craft::$app->getRequest()->getParam('assetId');
        }

        if (!$assetId) {
            return $this->asJson([
                'error' => 'Asset ID is required',
            ])->setStatusCode(400);
        }

        $asset = Craft::$app->getAssets()->getAssetById($assetId);

        if (!$asset) {
            return $this->asJson([
                'error' => 'Asset not found',
            ])->setStatusCode(404);
        }

        try {
            // Get the asset contents as a stream
            $stream = $asset->getStream();
            $contents = stream_get_contents($stream);
            fclose($stream);

            // Validate file is not empty
            if (empty($contents) || trim($contents) === '') {
                return $this->asJson([
                    'error' => Craft::t('craft-lottie', 'The selected file is empty. Please select a valid Lottie animation file.'),
                    'errorCode' => 'EMPTY_FILE',
                ])->setStatusCode(400);
            }

            // Note: We don't validate file size here - Lottie files can be large
            // If there's a need to limit size, it should be done at upload time via Craft's asset settings

            // Validate it's a valid Lottie file (pass filename for format detection)
            $validation = \vu\craftlottie\Plugin::getInstance()->getLottieValidator()->validateLottieFile($contents, $asset->filename);
            
            if (!$validation['valid']) {
                // Log the validation error for debugging
                Craft::error('Lottie validation failed for asset ' . $assetId . ': ' . $validation['error'], __METHOD__);
                return $this->asJson([
                    'error' => Craft::t('craft-lottie', $validation['error']),
                    'errorCode' => 'INVALID_LOTTIE',
                ])->setStatusCode(400);
            }

            $jsonData = $validation['data'];

            // Get metadata (background color, speed, and interactions) if exists
            $metadata = (new \craft\db\Query())
                ->select(['backgroundColor', 'speed', 'interactions'])
                ->from('{{%lottie_metadata}}')
                ->where(['assetId' => $assetId])
                ->one();

            $interactions = null;
            if ($metadata && isset($metadata['interactions'])) {
                try {
                    $interactions = \craft\helpers\Json::decode($metadata['interactions']);
                } catch (\Exception $e) {
                    // Invalid JSON, use null
                }
            }

            $response = [
                'animation' => $jsonData,
                'backgroundColor' => $metadata['backgroundColor'] ?? null,
                'speed' => isset($metadata['speed']) ? (float)$metadata['speed'] : 1.0,
                'interactions' => $interactions,
            ];

            return $this->asJson($response);
        } catch (\Exception $e) {
            Craft::error('Failed to read asset: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'error' => Craft::t('craft-lottie', 'Failed to read the file: {message}', ['message' => $e->getMessage()]),
                'errorCode' => 'READ_ERROR',
            ])->setStatusCode(500);
        }
    }

    /**
     * Save edited JSON data back to the asset
     */
    public function actionSaveAssetJson(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $assetId = $request->getBodyParam('assetId');
        $jsonDataString = $request->getBodyParam('jsonData');
        $backgroundColor = $request->getBodyParam('backgroundColor');
        $speed = $request->getBodyParam('speed');
        $interactionsJson = $request->getBodyParam('interactions');

        // Parse the JSON string back to array
        $jsonData = null;
        if ($jsonDataString) {
            try {
                $jsonData = json_decode($jsonDataString, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    return $this->asJson([
                        'success' => false,
                        'error' => Craft::t('craft-lottie', 'Invalid JSON data: {message}', ['message' => json_last_error_msg()]),
                        'errorCode' => 'INVALID_JSON',
                    ]);
                }
            } catch (\Exception $e) {
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'Failed to parse JSON data: {message}', ['message' => $e->getMessage()]),
                    'errorCode' => 'JSON_PARSE_ERROR',
                ]);
            }
        }

        if (!$assetId || !$jsonData) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Asset ID and JSON data are required'),
                'errorCode' => 'MISSING_DATA',
            ]);
        }

        // Validate the Lottie data before saving
        $validation = \vu\craftlottie\Plugin::getInstance()->getLottieValidator()->validateLottieFile($jsonData);
        if (!$validation['valid']) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', $validation['error']),
                'errorCode' => 'INVALID_LOTTIE',
            ]);
        }

        $asset = Craft::$app->getAssets()->getAssetById($assetId);

        if (!$asset) {
            return $this->asJson([
                'success' => false,
                'error' => 'Asset not found',
            ]);
        }

        try {
            // Convert the data to JSON string
            $jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->asJson([
                    'success' => false,
                    'error' => 'Invalid JSON data: ' . json_last_error_msg(),
                ]);
            }

            // Determine if we should save as .lottie (compressed) or .json
            // Preserve the original file format
            $originalExtension = strtolower(pathinfo($asset->filename, PATHINFO_EXTENSION));
            $shouldCompress = ($originalExtension === 'lottie');
            
            $validator = \vu\craftlottie\Plugin::getInstance()->getLottieValidator();
            
            // Prepare file content and extension
            $fileContent = $jsonString;
            $fileExtension = 'json';
            $tempFileName = uniqid('lottie_') . '.json';
            
            if ($shouldCompress) {
                // Compress to .lottie format
                try {
                    $fileContent = $validator->compressLottie($jsonString);
                    $fileExtension = 'lottie';
                    $tempFileName = uniqid('lottie_') . '.lottie';
                } catch (\Exception $e) {
                    Craft::warning('Failed to compress to .lottie format, saving as JSON instead: ' . $e->getMessage(), __METHOD__);
                    // Fall back to JSON if compression fails
                }
            }

            // Create a temporary file with the content
            $tempPath = Craft::$app->getPath()->getTempPath() . '/' . $tempFileName;
            file_put_contents($tempPath, $fileContent);

            // Update filename if extension changed (shouldn't happen, but handle it)
            $newFilename = $asset->filename;
            if ($shouldCompress && $originalExtension !== 'lottie') {
                // Change extension to .lottie
                $newFilename = pathinfo($asset->filename, PATHINFO_FILENAME) . '.lottie';
            } elseif (!$shouldCompress && $originalExtension === 'lottie') {
                // Change extension to .json
                $newFilename = pathinfo($asset->filename, PATHINFO_FILENAME) . '.json';
            }

            // Replace the asset's file content
            $asset->setVolumeId($asset->volumeId);
            $asset->newFolderId = $asset->folderId;
            $asset->tempFilePath = $tempPath;
            $asset->filename = $newFilename;

            if (!Craft::$app->getElements()->saveElement($asset)) {
                @unlink($tempPath);
                return $this->asJson([
                    'success' => false,
                    'error' => 'Failed to save asset: ' . implode(', ', $asset->getErrorSummary(true)),
                ]);
            }

            // Clean up temp file
            @unlink($tempPath);

            // Validate and normalize speed
            $speedValue = 1.0;
            if ($speed !== null && $speed !== '') {
                $speedValue = (float)$speed;
                // Clamp speed between 0.1 and 5.0
                if ($speedValue < 0.1) {
                    $speedValue = 0.1;
                } elseif ($speedValue > 5.0) {
                    $speedValue = 5.0;
                }
            }

            // Save metadata (background color and speed) in a separate table
            $metadataData = [
                'assetId' => $assetId,
                'dateUpdated' => date('Y-m-d H:i:s'),
            ];

            if ($backgroundColor !== null && $backgroundColor !== '') {
                // Validate hex color format
                if (preg_match('/^#[0-9A-Fa-f]{6}$/', $backgroundColor)) {
                    $metadataData['backgroundColor'] = $backgroundColor;
                }
            }

            $metadataData['speed'] = $speedValue;

            // Handle interactions
            $interactionsData = null;
            if ($interactionsJson !== null && $interactionsJson !== '') {
                try {
                    $interactionsArray = \craft\helpers\Json::decode($interactionsJson);
                    if (is_array($interactionsArray)) {
                        $interactionsData = \craft\helpers\Json::encode($interactionsArray);
                    }
                } catch (\Exception $e) {
                    Craft::warning('Failed to decode interactions JSON: ' . $e->getMessage(), __METHOD__);
                }
            }

            Craft::$app->getDb()->createCommand()
                ->upsert('{{%lottie_metadata}}', [
                    'assetId' => $assetId,
                    'backgroundColor' => $metadataData['backgroundColor'] ?? null,
                    'speed' => $speedValue,
                    'interactions' => $interactionsData,
                    'dateCreated' => date('Y-m-d H:i:s'),
                    'dateUpdated' => date('Y-m-d H:i:s'),
                ], [
                    'backgroundColor' => $metadataData['backgroundColor'] ?? null,
                    'speed' => $speedValue,
                    'interactions' => $interactionsData,
                    'dateUpdated' => date('Y-m-d H:i:s'),
                ])
                ->execute();

            return $this->asJson([
                'success' => true,
                'message' => 'Asset saved successfully',
            ]);
        } catch (\Exception $e) {
            Craft::error('Failed to save asset: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'success' => false,
                'error' => 'Failed to save asset: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Upload a Lottie file to the configured volume
     */
    public function actionUpload(): Response
    {
        $this->requirePostRequest();
        
        $plugin = \vu\craftlottie\Plugin::getInstance();
        $settings = $plugin->getSettings();
        
        // Get configured volume ID
        $volumeId = $settings->lottieVolumeId ?? null;
        
        if (!$volumeId || $volumeId <= 0) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'No volume configured. Please configure a Lottie volume in plugin settings.'),
            ])->setStatusCode(400);
        }
        
        // Get the volume by ID
        $volume = Craft::$app->getVolumes()->getVolumeById($volumeId);
        
        if (!$volume) {
            Craft::error("Volume lookup failed. Requested ID: {$volumeId}", __METHOD__);
            
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Configured volume (ID: {id}) not found. Please check your plugin settings.', ['id' => $volumeId]),
            ])->setStatusCode(400);
        }
        
        // Get the uploaded file
        $uploadedFile = \yii\web\UploadedFile::getInstanceByName('file');
        
        if (!$uploadedFile || $uploadedFile->hasError) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'File upload failed.'),
            ])->setStatusCode(400);
        }
        
        // Validate file extension
        $extension = strtolower($uploadedFile->extension);
        if ($extension !== 'json' && $extension !== 'lottie') {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Only JSON and .lottie files are allowed.'),
            ])->setStatusCode(400);
        }
        
        try {
            // Read file contents to validate it's a Lottie file
            $contents = file_get_contents($uploadedFile->tempName);
            
            if (empty($contents)) {
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'The uploaded file is empty.'),
                ])->setStatusCode(400);
            }
            
            // Validate it's a valid Lottie file (pass filename for format detection)
            $validation = $plugin->getLottieValidator()->validateLottieFile($contents, $uploadedFile->name);
            
            if (!$validation['valid']) {
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', $validation['error']),
                ])->setStatusCode(400);
            }
            
            // Get the root folder for the volume
            $folder = Craft::$app->getAssets()->getRootFolderByVolumeId($volume->id);
            
            if (!$folder) {
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'Could not find root folder for volume.'),
                ])->setStatusCode(500);
            }
            
            // Create asset
            $asset = new \craft\elements\Asset();
            $asset->tempFilePath = $uploadedFile->tempName;
            $asset->filename = $uploadedFile->name;
            $asset->newFolderId = $folder->id;
            $asset->volumeId = $volume->id;
            $asset->avoidFilenameConflicts = true;
            
            // Save the asset
            if (!Craft::$app->getElements()->saveElement($asset)) {
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'Failed to save asset: {errors}', [
                        'errors' => implode(', ', $asset->getErrorSummary(true))
                    ]),
                ])->setStatusCode(500);
            }
            
            return $this->asJson([
                'success' => true,
                'assetId' => $asset->id,
                'filename' => $asset->filename,
                'message' => Craft::t('craft-lottie', 'File uploaded successfully.'),
            ]);
        } catch (\Exception $e) {
            Craft::error('Failed to upload Lottie file: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Failed to upload file: {message}', [
                    'message' => $e->getMessage()
                ]),
            ])->setStatusCode(500);
        }
    }

    /**
     * Save edited JSON data as a new asset (Save as Copy)
     */
    public function actionSaveAsNewAsset(): Response
    {
        $this->requirePostRequest();

        $request = Craft::$app->getRequest();
        $assetId = $request->getBodyParam('assetId');
        $jsonDataString = $request->getBodyParam('jsonData');
        $backgroundColor = $request->getBodyParam('backgroundColor');
        $speed = $request->getBodyParam('speed');
        $interactionsJson = $request->getBodyParam('interactions');

        // Parse the JSON string back to array
        $jsonData = null;
        if ($jsonDataString) {
            try {
                $jsonData = json_decode($jsonDataString, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    return $this->asJson([
                        'success' => false,
                        'error' => Craft::t('craft-lottie', 'Invalid JSON data: {message}', ['message' => json_last_error_msg()]),
                        'errorCode' => 'INVALID_JSON',
                    ]);
                }
            } catch (\Exception $e) {
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'Failed to parse JSON data: {message}', ['message' => $e->getMessage()]),
                    'errorCode' => 'JSON_PARSE_ERROR',
                ]);
            }
        }

        if (!$assetId || !$jsonData) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Asset ID and JSON data are required'),
                'errorCode' => 'MISSING_DATA',
            ]);
        }

        // Validate the Lottie data before saving
        $validation = \vu\craftlottie\Plugin::getInstance()->getLottieValidator()->validateLottieFile($jsonData);
        if (!$validation['valid']) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', $validation['error']),
                'errorCode' => 'INVALID_LOTTIE',
            ]);
        }

        // Get the original asset to copy its properties
        $originalAsset = Craft::$app->getAssets()->getAssetById($assetId);

        if (!$originalAsset) {
            return $this->asJson([
                'success' => false,
                'error' => 'Original asset not found',
            ]);
        }

        try {
            // Convert the data to JSON string
            $jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->asJson([
                    'success' => false,
                    'error' => 'Invalid JSON data: ' . json_last_error_msg(),
                ]);
            }

            // Determine if we should save as .lottie (compressed) or .json
            // Use the same format as the original asset
            $originalExtension = strtolower(pathinfo($originalAsset->filename, PATHINFO_EXTENSION));
            $shouldCompress = ($originalExtension === 'lottie');
            
            $validator = \vu\craftlottie\Plugin::getInstance()->getLottieValidator();
            
            // Prepare file content and extension
            $fileContent = $jsonString;
            $fileExtension = 'json';
            $tempFileName = uniqid('lottie_') . '.json';
            
            if ($shouldCompress) {
                // Compress to .lottie format
                try {
                    $fileContent = $validator->compressLottie($jsonString);
                    $fileExtension = 'lottie';
                    $tempFileName = uniqid('lottie_') . '.lottie';
                } catch (\Exception $e) {
                    Craft::warning('Failed to compress to .lottie format, saving as JSON instead: ' . $e->getMessage(), __METHOD__);
                    // Fall back to JSON if compression fails
                }
            }

            // Create a temporary file with the content
            $tempPath = Craft::$app->getPath()->getTempPath() . '/' . $tempFileName;
            file_put_contents($tempPath, $fileContent);

            // Generate unique filename: original-name-edited-{timestamp}.{ext}
            $originalName = pathinfo($originalAsset->filename, PATHINFO_FILENAME);
            $timestamp = date('YmdHis');
            $newFilename = $originalName . '-edited-' . $timestamp . '.' . $fileExtension;

            // Get the same folder and volume as the original asset
            $folder = $originalAsset->getFolder();
            $volume = $originalAsset->getVolume();

            if (!$folder || !$volume) {
                @unlink($tempPath);
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'Could not determine folder or volume for new asset.'),
                ]);
            }

            // Create new asset
            $newAsset = new \craft\elements\Asset();
            $newAsset->tempFilePath = $tempPath;
            $newAsset->filename = $newFilename;
            $newAsset->newFolderId = $folder->id;
            $newAsset->volumeId = $volume->id;
            $newAsset->avoidFilenameConflicts = true;
            $newAsset->setScenario(\craft\elements\Asset::SCENARIO_CREATE);

            // Save the new asset
            if (!Craft::$app->getElements()->saveElement($newAsset)) {
                @unlink($tempPath);
                return $this->asJson([
                    'success' => false,
                    'error' => Craft::t('craft-lottie', 'Failed to create new asset: {errors}', [
                        'errors' => implode(', ', $newAsset->getErrorSummary(true))
                    ]),
                ]);
            }

            // Clean up temp file
            @unlink($tempPath);

            // Validate and normalize speed
            $speedValue = 1.0;
            if ($speed !== null && $speed !== '') {
                $speedValue = (float)$speed;
                // Clamp speed between 0.1 and 5.0
                if ($speedValue < 0.1) {
                    $speedValue = 0.1;
                } elseif ($speedValue > 5.0) {
                    $speedValue = 5.0;
                }
            }

            // Copy metadata (background color, speed, and interactions) to the new asset
            $metadataData = [
                'assetId' => $newAsset->id,
                'dateCreated' => date('Y-m-d H:i:s'),
                'dateUpdated' => date('Y-m-d H:i:s'),
            ];

            if ($backgroundColor !== null && $backgroundColor !== '') {
                // Validate hex color format
                if (preg_match('/^#[0-9A-Fa-f]{6}$/', $backgroundColor)) {
                    $metadataData['backgroundColor'] = $backgroundColor;
                }
            }

            $metadataData['speed'] = $speedValue;

            // Handle interactions
            $interactionsData = null;
            if ($interactionsJson !== null && $interactionsJson !== '') {
                try {
                    $interactionsArray = \craft\helpers\Json::decode($interactionsJson);
                    if (is_array($interactionsArray)) {
                        $interactionsData = \craft\helpers\Json::encode($interactionsArray);
                    }
                } catch (\Exception $e) {
                    Craft::warning('Failed to decode interactions JSON: ' . $e->getMessage(), __METHOD__);
                }
            }

            // Save metadata for the new asset
            Craft::$app->getDb()->createCommand()
                ->insert('{{%lottie_metadata}}', [
                    'assetId' => $newAsset->id,
                    'backgroundColor' => $metadataData['backgroundColor'] ?? null,
                    'speed' => $speedValue,
                    'interactions' => $interactionsData,
                    'dateCreated' => date('Y-m-d H:i:s'),
                    'dateUpdated' => date('Y-m-d H:i:s'),
                ])
                ->execute();

            return $this->asJson([
                'success' => true,
                'assetId' => $newAsset->id,
                'filename' => $newAsset->filename,
                'message' => Craft::t('craft-lottie', 'Animation saved as new asset successfully.'),
            ]);
        } catch (\Exception $e) {
            Craft::error('Failed to save as new asset: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Failed to save as new asset: {message}', ['message' => $e->getMessage()]),
            ]);
        }
    }
}
