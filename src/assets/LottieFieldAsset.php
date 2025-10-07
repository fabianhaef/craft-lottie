<?php

namespace vu\craftcraftlottie\assets;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

class LottieFieldAsset extends AssetBundle
{
    public function init()
    {
        $this->sourcePath = __DIR__;

        $this->depends = [
            CpAsset::class,
        ];

        $this->js = [
            'js/lottie-editor.js',
        ];

        $this->css = [
            'css/lottie-field.css',
        ];

        parent::init();
    }
}