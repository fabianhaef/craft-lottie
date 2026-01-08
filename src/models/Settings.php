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
     * @var array<int> Array of volume IDs where Lottie files should be stored
     */
    public array $lottieVolumes = [];

    /**
     * @inheritdoc
     */
    public function attributeLabels(): array
    {
        return [
            'lottieVolumes' => Craft::t('craft-lottie', 'Lottie Volumes'),
        ];
    }

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            [['lottieVolumes'], 'safe'],
        ];
    }
}
