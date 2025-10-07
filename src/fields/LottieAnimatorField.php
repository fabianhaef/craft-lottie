<?php

namespace vu\craftcraftlottie\fields;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use craft\helpers\Json;
use craft\helpers\Assets as AssetsHelper;
use craft\models\Volume;
use yii\db\Schema;

class LottieAnimatorField extends Field
{
    public ?string $defaultUploadLocationSource = null;
    public ?string $defaultUploadLocationSubpath = null;
    public bool $enableColorEditing = true;
    public bool $enableSpeedControl = true;

    public static function displayName(): string
    {
        return Craft::t('craft-lottie', 'Lottie Animator');
    }

    public function getContentColumnType(): array|string
    {
        return Schema::TYPE_JSON;
    }

    public function normalizeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value === null || $value === '' || $value === []) {
            return null;
        }

        if (is_string($value)) {
            try {
                $value = Json::decode($value);
            } catch (\Exception $e) {
                Craft::error('Failed to decode Lottie field value: ' . $e->getMessage(), __METHOD__);
                return null;
            }
        }

        // Ensure we have an array structure with at least an assetId
        if (is_array($value)) {
            $normalized = [
                'assetId' => $value['assetId'] ?? null,
                'data' => $value['data'] ?? null,
                'speed' => $value['speed'] ?? 1.0,
            ];

            // If no assetId, return null
            if (!$normalized['assetId']) {
                return null;
            }

            Craft::info('Lottie normalizeValue output: ' . print_r($normalized, true), __METHOD__);
            return $normalized;
        }

        return $value;
    }

    public function serializeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value === null) {
            return null;
        }

        return Json::encode($value);
    }

    public function getInputHtml(mixed $value, ?ElementInterface $element = null): string
    {
        $id = $this->getInputId();
        $namespacedId = Craft::$app->getView()->namespaceInputId($id);

        // Register our field assets
        Craft::$app->getView()->registerAssetBundle(\vu\craftcraftlottie\assets\LottieFieldAsset::class);

        return Craft::$app->getView()->renderTemplate('craft-lottie/_field-input', [
            'field' => $this,
            'id' => $id,
            'namespacedId' => $namespacedId,
            'value' => $value,
            'name' => $this->handle,
        ]);
    }

    public function getSettingsHtml(): ?string
    {
        return Craft::$app->getView()->renderTemplate('craft-lottie/_field-settings', [
            'field' => $this,
        ]);
    }

    /**
     * Handle setting unknown properties (for backward compatibility)
     */
    public function __set($name, $value)
    {
        // Handle old property name for backward compatibility
        if ($name === 'defaultUploadLocation') {
            // Ignore the old property, it's been replaced
            return;
        }

        parent::__set($name, $value);
    }
}