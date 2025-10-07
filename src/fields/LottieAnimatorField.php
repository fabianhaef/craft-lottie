<?php

namespace vu\craftcraftlottie\fields;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use craft\helpers\Json;
use yii\db\Schema;

class LottieAnimatorField extends Field
{
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
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            try {
                $value = Json::decode($value);
            } catch (\Exception $e) {
                return null;
            }
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
}