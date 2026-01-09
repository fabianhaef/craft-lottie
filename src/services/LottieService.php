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
    /**
     * Render a Lottie animation
     *
     * @param mixed $fieldValue The field value (can be array, Asset, or asset ID)
     * @param array<string, mixed> $options Rendering options (loop, autoplay, renderer, speed, width, height, id, class)
     * @return Markup HTML markup with the animation container and initialization script
     */
    public function render($fieldValue, array $options = []): Markup
    {
        // Handle different value formats
        $assetId = null;
        $lottieData = null;
        $savedSpeed = 1.0;

        $backgroundColor = null;
        
        if (is_array($fieldValue)) {
            // New format: array with assetId, data, speed, backgroundColor
            $assetId = $fieldValue['assetId'] ?? null;
            $lottieData = $fieldValue['data'] ?? null;
            $savedSpeed = $fieldValue['speed'] ?? 1.0;
            $backgroundColor = $fieldValue['backgroundColor'] ?? null;
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

        $interactions = null;
        
        // Try to get interactions from field value first
        if (is_array($fieldValue) && isset($fieldValue['interactions'])) {
            $interactions = $fieldValue['interactions'];
        }
        
        // Always try to get from metadata (interactions are stored there, not in field value)
        $metadata = (new \craft\db\Query())
            ->select(['speed', 'backgroundColor', 'interactions'])
            ->from('{{%lottie_metadata}}')
            ->where(['assetId' => $assetId])
            ->one();
        
        if ($metadata) {
            if ($savedSpeed === 1.0 && isset($metadata['speed'])) {
                $savedSpeed = (float)$metadata['speed'];
            }
            if ($backgroundColor === null && isset($metadata['backgroundColor'])) {
                $backgroundColor = $metadata['backgroundColor'];
            }
            // Always load interactions from metadata if available
            if (isset($metadata['interactions']) && !empty($metadata['interactions'])) {
                try {
                    $decoded = Json::decode($metadata['interactions']);
                    if (is_array($decoded) && !empty($decoded)) {
                        $interactions = $decoded;
                        Craft::info('Loaded ' . count($interactions) . ' interactions from metadata for asset ' . $assetId, __METHOD__);
                    }
                } catch (\Exception $e) {
                    // Invalid JSON, use null
                    Craft::warning('Failed to decode interactions JSON: ' . $e->getMessage(), __METHOD__);
                }
            }
        }
        
        // Log if no interactions found
        if (!$interactions || empty($interactions)) {
            Craft::info('No interactions found for asset ' . $assetId, __METHOD__);
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
        $style = "width: {$options['width']}; height: {$options['height']};";
        if ($backgroundColor) {
            $style .= " background-color: {$backgroundColor};";
        }
        
        $containerAttributes = [
            'id' => $options['id'],
            'class' => $options['class'],
            'style' => $style,
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
        
        // Generate interaction code
        $interactionsCode = $this->generateInteractionsCode($interactions, $containerId, $uniqueId);

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
        
        (function(anim) {
            {$interactionsCode}
        })(animation);
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
            .then(function(data) {
                var animation = lottie.loadAnimation({
                    container: document.getElementById('{$containerId}'),
                    renderer: '{$renderer}',
                    loop: {$loop},
                    autoplay: {$autoplay},
                    animationData: data.animation || data
                });
                animation.setSpeed({$speed});
                
                (function(anim) {
                    {$interactionsCode}
                })(animation);
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

    /**
     * Generate JavaScript code for interactions
     *
     * @param array<int, array<string, mixed>>|null $interactions Array of interaction configurations
     * @param string $containerId The container element ID
     * @param string $uniqueId Unique identifier for the animation instance
     * @return string JavaScript code for all enabled interactions
     */
    private function generateInteractionsCode(?array $interactions, string $containerId, string $uniqueId): string
    {
        if (!$interactions || !is_array($interactions) || empty($interactions)) {
            return '';
        }
        
        // Log for debugging
        Craft::info('Generating interactions code for ' . count($interactions) . ' interactions', __METHOD__);

        $code = '';
        $containerVar = 'container_' . $uniqueId;
        // Use 'anim' as the variable name since it's scoped in the IIFE
        $animationVar = 'anim';

        foreach ($interactions as $index => $interaction) {
            if (!isset($interaction['type']) || !isset($interaction['enabled']) || !$interaction['enabled']) {
                continue;
            }

            $type = $interaction['type'];
            $interactionCode = '';

            switch ($type) {
                case 'scroll':
                    $trigger = $interaction['trigger'] ?? 'onScroll';
                    $offset = isset($interaction['offset']) ? (float)$interaction['offset'] : 0.0;
                    $direction = $interaction['direction'] ?? 'forward';
                    
                    if ($trigger === 'onScroll') {
                        $interactionCode = <<<JS
(function() {
    var container = document.getElementById('{$containerId}');
    if (!container) {
        console.warn('Container not found for scroll interaction: {$containerId}');
        return;
    }
    var lastScrollY = window.scrollY;
    var isScrolling = false;
    
    function handleScroll() {
        if (isScrolling) return;
        isScrolling = true;
        requestAnimationFrame(function() {
            var currentScrollY = window.scrollY;
            var scrollDelta = currentScrollY - lastScrollY;
            lastScrollY = currentScrollY;
            
            if (scrollDelta > 0 && ('{$direction}' === 'forward' || '{$direction}' === 'both')) {
                anim.play();
            } else if (scrollDelta < 0 && ('{$direction}' === 'backward' || '{$direction}' === 'both')) {
                anim.setDirection(-1);
                anim.play();
            }
            
            isScrolling = false;
        });
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
})();
JS;
                    } elseif ($trigger === 'onViewport') {
                        $interactionCode = <<<JS
(function() {
    var container = document.getElementById('{$containerId}');
    if (!container) {
        console.warn('Container not found for viewport interaction: {$containerId}');
        return;
    }
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                anim.play();
            } else {
                anim.pause();
            }
        });
    }, { threshold: {$offset} });
    
    observer.observe(container);
})();
JS;
                    }
                    break;

                case 'click':
                    $action = $interaction['action'] ?? 'play';
                    $interactionCode = <<<JS
(function() {
    var container = document.getElementById('{$containerId}');
    if (!container) {
        console.warn('Container not found for click interaction: {$containerId}');
        return;
    }
    container.style.cursor = 'pointer';
    container.addEventListener('click', function() {
        if ('{$action}' === 'play') {
            anim.play();
        } else if ('{$action}' === 'pause') {
            anim.pause();
        } else if ('{$action}' === 'toggle') {
            if (anim.isPaused) {
                anim.play();
            } else {
                anim.pause();
            }
        } else if ('{$action}' === 'restart') {
            anim.goToAndPlay(0);
        }
    });
})();
JS;
                    break;

                case 'hover':
                    $onEnter = $interaction['onEnter'] ?? 'play';
                    $onLeave = $interaction['onLeave'] ?? 'pause';
                    $interactionCode = <<<JS
(function() {
    var container = document.getElementById('{$containerId}');
    if (!container) {
        console.warn('Container not found for hover interaction: {$containerId}');
        return;
    }
    container.addEventListener('mouseenter', function() {
        if ('{$onEnter}' === 'play') {
            anim.play();
        } else if ('{$onEnter}' === 'pause') {
            anim.pause();
        } else if ('{$onEnter}' === 'restart') {
            anim.goToAndPlay(0);
        }
    });
    container.addEventListener('mouseleave', function() {
        if ('{$onLeave}' === 'play') {
            anim.play();
        } else if ('{$onLeave}' === 'pause') {
            anim.pause();
        } else if ('{$onLeave}' === 'restart') {
            anim.goToAndPlay(0);
        }
    });
})();
JS;
                    break;

                case 'url':
                    $url = htmlspecialchars($interaction['url'] ?? '', ENT_QUOTES, 'UTF-8');
                    $target = htmlspecialchars($interaction['target'] ?? '_self', ENT_QUOTES, 'UTF-8');
                    $layerName = htmlspecialchars($interaction['layerName'] ?? '', ENT_QUOTES, 'UTF-8');
                    
                    if ($layerName) {
                        // Make specific layer clickable
                        $interactionCode = <<<JS
(function() {
    var container = document.getElementById('{$containerId}');
    if (!container) {
        console.warn('Container not found for URL interaction: {$containerId}');
        return;
    }
    var svgElements = container.querySelectorAll('[data-name="{$layerName}"]');
    svgElements.forEach(function(el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
            window.open('{$url}', '{$target}');
        });
    });
})();
JS;
                    } else {
                        // Make entire animation clickable
                        $interactionCode = <<<JS
(function() {
    var container = document.getElementById('{$containerId}');
    if (!container) {
        console.warn('Container not found for URL interaction: {$containerId}');
        return;
    }
    container.style.cursor = 'pointer';
    container.addEventListener('click', function() {
        window.open('{$url}', '{$target}');
    });
})();
JS;
                    }
                    break;
            }

            if ($interactionCode) {
                $code .= $interactionCode . "\n";
            }
        }

        return $code;
    }
}
