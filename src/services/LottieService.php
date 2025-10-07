<?php

namespace vu\craftcraftlottie\services;

use Craft;
use craft\base\Component;
use craft\helpers\Json;
use craft\helpers\Template;
use Twig\Markup;

class LottieService extends Component
{
    public function render($fieldValue, array $options = []): Markup
    {
        if (!$fieldValue || !isset($fieldValue['data'])) {
            return Template::raw('');
        }

        $animationData = $fieldValue['data'];
        $speed = $fieldValue['speed'] ?? 1.0;
        
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
        $jsOptions = [
            'container' => $options['id'],
            'renderer' => $options['renderer'],
            'loop' => $options['loop'],
            'autoplay' => $options['autoplay'],
            'animationData' => $animationData
        ];
        
        $jsOptionsJson = Json::encode($jsOptions);
        
        $html = <<<HTML
<div{$attributeString}></div>
<script>
(function() {
    function initLottie() {
        if (typeof lottie === 'undefined') {
            // Load lottie-web if not already loaded
            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.13.0/lottie.min.js';
            script.onload = function() {
                var animation = lottie.loadAnimation({$jsOptionsJson});
                animation.setSpeed({$speed});
            };
            document.head.appendChild(script);
        } else {
            var animation = lottie.loadAnimation({$jsOptionsJson});
            animation.setSpeed({$speed});
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLottie);
    } else {
        initLottie();
    }
})();
</script>
HTML;
        
        return Template::raw($html);
    }
}