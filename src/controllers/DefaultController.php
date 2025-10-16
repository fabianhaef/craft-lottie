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
     * @var bool Whether to allow anonymous access
     */
    protected array|bool|int $allowAnonymous = ['get-asset-json'];

    /**
     * Main index action - List all Lottie files
     */
    public function actionIndex(): Response
    {
        // Get all JSON assets (potential Lottie files)
        $lottieAssets = \craft\elements\Asset::find()
            ->kind('json')
            ->orderBy(['dateCreated' => SORT_DESC])
            ->all();

        return $this->renderTemplate('craft-lottie/index', [
            'title' => 'Lottie Animator',
            'lottieAssets' => $lottieAssets,
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
                'error' => 'Asset ID is required'
            ], 400);
        }

        $asset = Craft::$app->getAssets()->getAssetById($assetId);

        if (!$asset) {
            return $this->asJson([
                'error' => 'Asset not found'
            ], 404);
        }

        try {
            // Get the asset contents as a stream
            $stream = $asset->getStream();
            $contents = stream_get_contents($stream);
            fclose($stream);

            // Parse to validate it's valid JSON
            $jsonData = json_decode($contents, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->asJson([
                    'error' => 'Invalid JSON file: ' . json_last_error_msg()
                ], 400);
            }

            // Return the raw JSON
            return $this->asJson($jsonData);

        } catch (\Exception $e) {
            Craft::error('Failed to read asset: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'error' => 'Failed to read asset: ' . $e->getMessage()
            ], 500);
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

        // Parse the JSON string back to array
        $jsonData = $jsonDataString ? json_decode($jsonDataString, true) : null;

        if (!$assetId || !$jsonData) {
            return $this->asJson([
                'success' => false,
                'error' => 'Asset ID and JSON data are required'
            ]);
        }

        $asset = Craft::$app->getAssets()->getAssetById($assetId);

        if (!$asset) {
            return $this->asJson([
                'success' => false,
                'error' => 'Asset not found'
            ]);
        }

        try {
            // Convert the data to JSON string
            $jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->asJson([
                    'success' => false,
                    'error' => 'Invalid JSON data: ' . json_last_error_msg()
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
                    'error' => 'Failed to save asset: ' . implode(', ', $asset->getErrorSummary(true))
                ]);
            }

            // Clean up temp file
            @unlink($tempPath);

            return $this->asJson([
                'success' => true,
                'message' => 'Asset saved successfully'
            ]);

        } catch (\Exception $e) {
            Craft::error('Failed to save asset: ' . $e->getMessage(), __METHOD__);
            return $this->asJson([
                'success' => false,
                'error' => 'Failed to save asset: ' . $e->getMessage()
            ]);
        }
    }
}
