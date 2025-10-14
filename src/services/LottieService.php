<?php

namespace vu\craftlottie\services;

use Craft;
use craft\base\Component;
use craft\elements\Asset;
use craft\helpers\Json;
use craft\helpers\Template;
use Twig\Markup;

class LottieService extends Component
{
    public function render($fieldValue, array $options = []): Markup
    {
        // Handle Asset element or asset ID
        $asset = null;
        if ($fieldValue instanceof Asset) {
            $asset = $fieldValue;
        } elseif (is_numeric($fieldValue)) {
            $asset = Craft::$app->getAssets()->getAssetById($fieldValue);
        }

        if (!$asset) {
            return Template::raw('');
        }

        $speed = $options['speed'] ?? 1.0;
        
        // Merge default options
        $defaultOptions = [
            'loop' => true,
            'autoplay' => true,
            'renderer' => 'svg',
            'speed' => $speed,
            'width' => '100%',
            'height' => 'auto',
            'id' => 'lottie-' . uniqid(),
            'class' => 'lottie-animation'
        ];
        
        $options = array_merge($defaultOptions, $options);
        
        // Generate container HTML
        $containerAttributes = [
            'id' => $options['id'],
            'class' => $options['class'],
            'style' => "width: {$options['width']}; height: {$options['height']};"
        ];
        
        $attributeString = '';
        foreach ($containerAttributes as $attr => $value) {
            $attributeString .= " {$attr}=\"" . htmlspecialchars($value) . "\"";
        }
        
        // Generate JavaScript initialization
        $containerId = $options['id'];
        $assetId = $asset->id;
        $renderer = $options['renderer'];
        $loop = $options['loop'] ? 'true' : 'false';
        $autoplay = $options['autoplay'] ? 'true' : 'false';
        $uniqueId = str_replace('-', '_', $containerId);

        $html = <<<HTML
<div{$attributeString}></div>
<script>
(function() {
    var lottieScriptLoaded = typeof lottie !== 'undefined';

    function initLottie_{$uniqueId}() {
        fetch('/actions/craft-lottie/default/get-asset-json?assetId={$assetId}')
            .then(function(response) { return response.json(); })
            .then(function(animationData) {
                var animation = lottie.loadAnimation({
                    container: document.getElementById('{$containerId}'),
                    renderer: '{$renderer}',
                    loop: {$loop},
                    autoplay: {$autoplay},
                    animationData: animationData
                });
                animation.setSpeed({$speed});
            })
            .catch(function(error) {
                console.error('Failed to load Lottie animation:', error);
            });
    }

    if (lottieScriptLoaded) {
        initLottie_{$uniqueId}();
    } else {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
        script.onload = function() { initLottie_{$uniqueId}(); };
        document.head.appendChild(script);
    }
})();
</script>
HTML;
        
        return Template::raw($html);
    }
}