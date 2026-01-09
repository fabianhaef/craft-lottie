<?php

namespace vu\craftlottie\models;

use Craft;
use craft\base\Model;

/**
 * Settings model for the Craft Lottie plugin
 */
class Settings extends Model
{
    /**
     * @var int|null Volume ID where Lottie files should be stored
     */
    public ?int $lottieVolumeId = null;

    /**
     * @var array<string> Brand color palette (array of hex color codes)
     */
    public array $brandPalette = [];

    /**
     * @inheritdoc
     */
    public function attributeLabels(): array
    {
        return [
            'lottieVolumeId' => Craft::t('craft-lottie', 'Lottie Volume'),
            'brandPalette' => Craft::t('craft-lottie', 'Brand Palette'),
        ];
    }

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            [['lottieVolumeId'], 'safe'],
            [['lottieVolumeId'], 'integer', 'min' => 1],
            [['brandPalette'], 'safe'],
            [['brandPalette'], 'validateBrandPalette'],
        ];
    }

    /**
     * Validates brand palette colors
     */
    public function validateBrandPalette(string $attribute): void
    {
        if (!is_array($this->brandPalette)) {
            $this->addError($attribute, Craft::t('craft-lottie', 'Brand palette must be an array.'));
            return;
        }

        foreach ($this->brandPalette as $index => $color) {
            if (!is_string($color) || !preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
                $this->addError($attribute, Craft::t('craft-lottie', 'Invalid color format at index {index}. Colors must be in hex format (e.g., #FF0000).', ['index' => $index]));
            }
        }
    }

    /**
     * @inheritdoc
     */
    public function init(): void
    {
        parent::init();

        // Normalize volume ID to integer or null
        if ($this->lottieVolumeId !== null) {
            $this->lottieVolumeId = (int)$this->lottieVolumeId;
            // Volume IDs in Craft CMS are positive integers starting from 1
            if ($this->lottieVolumeId <= 0) {
                $this->lottieVolumeId = null;
            }
        }

        // Normalize brand palette to array
        if (!is_array($this->brandPalette)) {
            $this->brandPalette = [];
        }

        // Filter out empty values and normalize hex colors
        $this->brandPalette = array_filter(
            array_map(function($color) {
                $color = trim($color);
                // Ensure color starts with #
                if ($color && !str_starts_with($color, '#')) {
                    $color = '#' . $color;
                }
                return $color;
            }, $this->brandPalette),
            function($color) {
                return !empty($color) && preg_match('/^#[0-9A-Fa-f]{6}$/', $color);
            }
        );
        $this->brandPalette = array_values($this->brandPalette); // Re-index
    }
}
