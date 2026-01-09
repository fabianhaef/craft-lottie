<?php

namespace vu\craftlottie\fields;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use craft\helpers\Json;
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

        // Validate and normalize the structure
        $normalized = [
            'assetId' => isset($value['assetId']) && is_numeric($value['assetId']) ? (int)$value['assetId'] : null,
            'data' => $value['data'] ?? null,
            'speed' => isset($value['speed']) && is_numeric($value['speed']) ? (float)$value['speed'] : 1.0,
            'backgroundColor' => isset($value['backgroundColor']) && is_string($value['backgroundColor']) ? $value['backgroundColor'] : null,
            'interactions' => $this->normalizeInteractions($value['interactions'] ?? []),
        ];

        // If no assetId, return null
        if (!$normalized['assetId']) {
            return null;
        }

        // Validate speed range
        if ($normalized['speed'] < 0.1 || $normalized['speed'] > 5.0) {
            $normalized['speed'] = 1.0;
        }

        // Validate background color format (hex color)
        if ($normalized['backgroundColor'] && !preg_match('/^#[0-9A-Fa-f]{6}$/', $normalized['backgroundColor'])) {
            $normalized['backgroundColor'] = null;
        }

        return $normalized;
    }

    /**
     * Normalize interactions array
     */
    private function normalizeInteractions(?array $interactions): array
    {
        if (!is_array($interactions)) {
            return [];
        }

        $normalized = [];
        foreach ($interactions as $interaction) {
            if (!is_array($interaction)) {
                continue;
            }

            $type = $interaction['type'] ?? null;
            if (!in_array($type, ['scroll', 'click', 'hover', 'url'])) {
                continue;
            }

            $normalizedInteraction = [
                'type' => $type,
                'enabled' => isset($interaction['enabled']) ? (bool)$interaction['enabled'] : true,
            ];

            // Type-specific fields
            switch ($type) {
                case 'scroll':
                    $normalizedInteraction['trigger'] = $interaction['trigger'] ?? 'onScroll';
                    $normalizedInteraction['offset'] = isset($interaction['offset']) ? (float)$interaction['offset'] : 0.0;
                    $normalizedInteraction['direction'] = $interaction['direction'] ?? 'forward';
                    break;
                case 'click':
                    $normalizedInteraction['action'] = $interaction['action'] ?? 'play';
                    break;
                case 'hover':
                    $normalizedInteraction['onEnter'] = $interaction['onEnter'] ?? 'play';
                    $normalizedInteraction['onLeave'] = $interaction['onLeave'] ?? 'pause';
                    break;
                case 'url':
                    $normalizedInteraction['url'] = $interaction['url'] ?? '';
                    $normalizedInteraction['target'] = $interaction['target'] ?? '_self';
                    $normalizedInteraction['layerName'] = $interaction['layerName'] ?? '';
                    break;
            }

            $normalized[] = $normalizedInteraction;
        }

        return $normalized;
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
