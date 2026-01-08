<?php

namespace vu\craftlottie\services;

use craft\base\Component;
use craft\elements\Asset;
use craft\helpers\Json;
use craft\helpers\Template;
use Twig\Markup;

class LottieService extends Component
{
    public function render($fieldValue, array $options = []): Markup
    {
        // Handle different value formats
        $assetId = null;
        $lottieData = null;
        $savedSpeed = 1.0;

        if (is_array($fieldValue)) {
            // New format: array with assetId, data, speed
            $assetId = $fieldValue['assetId'] ?? null;
            $lottieData = $fieldValue['data'] ?? null;
            $savedSpeed = $fieldValue['speed'] ?? 1.0;
        } elseif ($fieldValue instanceof Asset) {
            // Legacy: direct asset element
            $assetId = $fieldValue->id;
        } elseif (is_numeric($fieldValue)) {
            // Legacy: asset ID
            $assetId = $fieldValue;
        }

        if (!$assetId) {
            return Template::raw('');
        }

        // Use saved speed unless explicitly overridden
        $speed = $options['speed'] ?? $savedSpeed;
        
        // Merge default options
        $defaultOptions = [
            'loop' => true,
            'autoplay' => true,
            'renderer' => 'svg',
            'speed' => $speed,
            'width' => '100%',
            'height' => 'auto',
            'id' => 'lottie-' . uniqid(),
            'class' => 'lottie-animation',
        ];
        
        $options = array_merge($defaultOptions, $options);
        
        // Generate container HTML
        $containerAttributes = [
            'id' => $options['id'],
            'class' => $options['class'],
            'style' => "width: {$options['width']}; height: {$options['height']};",
        ];
        
        $attributeString = '';
        foreach ($containerAttributes as $attr => $value) {
            $attributeString .= " {$attr}=\"" . htmlspecialchars($value) . "\"";
        }
        
        // Generate JavaScript initialization
        $containerId = $options['id'];
        $renderer = $options['renderer'];
        $loop = $options['loop'] ? 'true' : 'false';
        $autoplay = $options['autoplay'] ? 'true' : 'false';
        $uniqueId = str_replace('-', '_', $containerId);

        // Use modified data if available, otherwise fetch from asset
        if ($lottieData) {
            $animationDataJson = Json::encode($lottieData);
            $html = <<<HTML
<div{$attributeString}></div>
<script>
(function() {
    var lottieScriptLoaded = typeof lottie !== 'undefined';
    var animationData = {$animationDataJson};

    function initLottie_{$uniqueId}() {
        var animation = lottie.loadAnimation({
            container: document.getElementById('{$containerId}'),
            renderer: '{$renderer}',
            loop: {$loop},
            autoplay: {$autoplay},
            animationData: animationData
        });
        animation.setSpeed({$speed});
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
        } else {
            // Fallback: fetch from asset
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
        }
        
        return Template::raw($html);
    }
}
