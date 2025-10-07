<?php

namespace vu\craftcraftlottie;

use Craft;
use craft\base\Plugin as BasePlugin;
use craft\events\RegisterComponentTypesEvent;
use craft\services\Fields;
use vu\craftcraftlottie\fields\LottieAnimatorField;
use vu\craftcraftlottie\services\LottieService;
use vu\craftcraftlottie\variables\LottieVariable;
use craft\web\twig\variables\CraftVariable;
use craft\web\UrlManager;
use craft\events\RegisterUrlRulesEvent;
use yii\base\Event;

/**
 * craft-lottie plugin
 *
 * @method static Plugin getInstance()
 * @method LottieService getLottieService()
 * @author 10vu10 <admin@10vu10.ch>
 * @copyright 10vu10
 * @license https://craftcms.github.io/license/ Craft License
 */
class Plugin extends BasePlugin
{
    public string $schemaVersion = '1.0.0';
    public bool $hasCpSettings = true;
    public bool $hasCpSection = true;

    public static function config(): array
    {
        return [
            'components' => [
                'lottieService' => LottieService::class,
            ],
        ];
    }

    public function init(): void
    {
        parent::init();

        $this->attachEventHandlers();
        $this->registerCpRoutes();

        // Any code that creates an element query or loads Twig should be deferred until
        // after Craft is fully initialized, to avoid conflicts with other plugins/modules
        Craft::$app->onInit(function () {
            // Register Twig variable
            Event::on(
                CraftVariable::class,
                CraftVariable::EVENT_INIT,
                function (Event $event) {
                    /** @var CraftVariable $variable */
                    $variable = $event->sender;
                    $variable->set('lottie', LottieVariable::class);
                }
            );
        });
    }

    private function attachEventHandlers(): void
    {
        // Register field type
        Event::on(
            Fields::class,
            Fields::EVENT_REGISTER_FIELD_TYPES,
            function (RegisterComponentTypesEvent $event) {
                $event->types[] = LottieAnimatorField::class;
            }
        );
    }

    public function registerCpRoutes(): void
    {
        Event::on(
            UrlManager::class,
            UrlManager::EVENT_REGISTER_CP_URL_RULES,
            function (RegisterUrlRulesEvent $event) {
                $event->rules['craft-lottie'] = 'craft-lottie/default/index';
                $event->rules['craft-lottie/edit/<assetId:\d+>'] = 'craft-lottie/default/edit';
            }
        );
    }

    /**
     * Get the plugin's name
     */
    public static function displayName(): string
    {
        return Craft::t('craft-lottie', 'Craft Lottie');
    }


    /**
     * Get the Lottie service
     */
    public function getLottieService(): LottieService
    {
        return $this->get('lottieService');
    }

    public function getCpNavItem(): ?array
    {
        $item = parent::getCpNavItem();

        $item['icon'] = '@craft-lottie/icon.svg';
        $item['url'] = 'craft-lottie';

        return $item;
    }
}
