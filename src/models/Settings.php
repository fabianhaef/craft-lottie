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
     * @inheritdoc
     */
    public function attributeLabels(): array
    {
        return [
            'lottieVolumeId' => Craft::t('craft-lottie', 'Lottie Volume'),
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
        ];
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
    }
}
