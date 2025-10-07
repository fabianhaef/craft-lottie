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
        return Schema::TYPE_INTEGER;
    }

    public function normalizeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value === null || $value === '' || $value === []) {
            return null;
        }

        // If it's already an Asset element, return it
        if ($value instanceof \craft\elements\Asset) {
            return $value;
        }

        if (is_string($value)) {
            try {
                $value = Json::decode($value);
            } catch (\Exception $e) {
                Craft::error('Failed to decode Lottie field value: ' . $e->getMessage(), __METHOD__);
                return null;
            }
        }

        // Extract the asset ID
        $assetId = null;

        if (is_array($value)) {
            // Extract assetId - it comes as an array from elementSelectField
            if (isset($value['assetId'])) {
                if (is_array($value['assetId']) && !empty($value['assetId'])) {
                    $assetId = $value['assetId'][0];
                } elseif (is_numeric($value['assetId'])) {
                    $assetId = $value['assetId'];
                }
            }
        } elseif (is_numeric($value)) {
            // It's already an asset ID
            $assetId = $value;
        }

        // If no assetId, return null
        if (!$assetId) {
            return null;
        }

        // Return the Asset element directly
        return Craft::$app->getAssets()->getAssetById((int)$assetId);
    }

    public function serializeValue(mixed $value, ?ElementInterface $element = null): mixed
    {
        if ($value instanceof \craft\elements\Asset) {
            return $value->id;
        }

        return $value;
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