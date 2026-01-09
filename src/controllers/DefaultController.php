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
        
        // Build asset query
        $assetQuery = \craft\elements\Asset::find()
            ->kind('json')
            ->orderBy(['dateCreated' => SORT_DESC]);
        
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

        return $this->renderTemplate('craft-lottie/edit', [
            'asset' => $asset,
            'title' => 'Edit: ' . $asset->filename,
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

            // Validate it's a valid Lottie file
            $validation = \vu\craftlottie\Plugin::getInstance()->getLottieValidator()->validateLottieFile($contents);
            
            if (!$validation['valid']) {
                // Log the validation error for debugging
                Craft::error('Lottie validation failed for asset ' . $assetId . ': ' . $validation['error'], __METHOD__);
                return $this->asJson([
                    'error' => Craft::t('craft-lottie', $validation['error']),
                    'errorCode' => 'INVALID_LOTTIE',
                ])->setStatusCode(400);
            }

            $jsonData = $validation['data'];

            // Get metadata (background color and speed) if exists
            $metadata = (new \craft\db\Query())
                ->select(['backgroundColor', 'speed'])
                ->from('{{%lottie_metadata}}')
                ->where(['assetId' => $assetId])
                ->one();

            $response = [
                'animation' => $jsonData,
                'backgroundColor' => $metadata['backgroundColor'] ?? null,
                'speed' => isset($metadata['speed']) ? (float)$metadata['speed'] : 1.0,
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

            // Create a temporary file with the new JSON content
            $tempPath = Craft::$app->getPath()->getTempPath() . '/' . uniqid('lottie_') . '.json';
            file_put_contents($tempPath, $jsonString);

            // Replace the asset's file content
            $asset->setVolumeId($asset->volumeId);
            $asset->newFolderId = $asset->folderId;
            $asset->tempFilePath = $tempPath;
            $asset->filename = $asset->filename;

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

            Craft::$app->getDb()->createCommand()
                ->upsert('{{%lottie_metadata}}', [
                    'assetId' => $assetId,
                    'backgroundColor' => $metadataData['backgroundColor'] ?? null,
                    'speed' => $speedValue,
                    'dateCreated' => date('Y-m-d H:i:s'),
                    'dateUpdated' => date('Y-m-d H:i:s'),
                ], [
                    'backgroundColor' => $metadataData['backgroundColor'] ?? null,
                    'speed' => $speedValue,
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
        $uploadedFile = Craft::$app->getRequest()->getUploadedFile('file');
        
        if (!$uploadedFile || $uploadedFile->hasError) {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'File upload failed.'),
            ])->setStatusCode(400);
        }
        
        // Validate file extension
        $extension = strtolower($uploadedFile->getExtension());
        if ($extension !== 'json') {
            return $this->asJson([
                'success' => false,
                'error' => Craft::t('craft-lottie', 'Only JSON files are allowed.'),
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
            
            // Validate it's a valid Lottie file
            $validation = $plugin->getLottieValidator()->validateLottieFile($contents);
            
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
}
