<?php

namespace vu\craftlottie\assets;

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
            'js/modules/LottieDataUtils.js',
            'js/modules/AnimationRenderer.js',
            'js/modules/ColorEditor.js',
            'js/modules/TextEditor.js',
            'js/modules/LayerManager.js',
            'js/modules/InteractionManager.js',
            'js/modules/DataManager.js',
            'js/lottie-editor-main.js',
            'js/lottie-editor.js', // Keep for field input
        ];

        $this->css = [
            'css/lottie-field.css',
        ];

        parent::init();
    }
}
