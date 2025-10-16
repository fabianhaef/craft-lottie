<?php

namespace vu\craftlottie\fields;

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
        return Schema::TYPE_TEXT;
    }

    public function normalizeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value === null || $value === '' || $value === []) {
            return null;
        }

        // If it's a string, decode it
        if (is_string($value)) {
            try {
                $value = Json::decode($value);
            } catch (\Exception $e) {
                Craft::error('Failed to decode Lottie field value: ' . $e->getMessage(), __METHOD__);
                return null;
            }
        }

        // If it's not an array at this point, return null
        if (!is_array($value)) {
            return null;
        }

        // Return the value object which contains: assetId, data (modified JSON), speed
        return $value;
    }

    public function serializeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value === null || $value === '' || $value === []) {
            return null;
        }

        // If it's already a string (JSON), return it
        if (is_string($value)) {
            return $value;
        }

        // Encode array to JSON
        if (is_array($value)) {
            return Json::encode($value);
        }

        return $value;
    }

    public function getInputHtml(mixed $value, ?ElementInterface $element = null): string
    {
        $id = $this->getInputId();
        $namespacedId = Craft::$app->getView()->namespaceInputId($id);

        // Register our field assets
        Craft::$app->getView()->registerAssetBundle(\vu\craftlottie\assets\LottieFieldAsset::class);

        // Debug log the value
        Craft::info('LottieAnimatorField value type: ' . gettype($value) . ', value: ' . print_r($value, true), __METHOD__);

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