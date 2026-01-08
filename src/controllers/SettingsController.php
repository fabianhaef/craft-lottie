<?php

namespace vu\craftlottie\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;
use vu\craftlottie\Plugin;
use vu\craftlottie\models\Settings;

/**
 * Settings controller for the Craft Lottie plugin
 */
class SettingsController extends Controller
{
    /**
     * Show settings page
     */
    public function actionIndex(): Response
    {
        $plugin = Plugin::getInstance();
        /** @var Settings $settings */
        $settings = $plugin->getSettings();

        return $this->renderTemplate('craft-lottie/settings', [
            'plugin' => $plugin,
            'settings' => $settings,
        ]);
    }

    /**
     * Save plugin settings
     */
    public function actionSave(): ?Response
    {
        $this->requirePostRequest();

        $plugin = Plugin::getInstance();
        /** @var Settings $settings */
        $settings = $plugin->getSettings();
        $postedSettings = $this->request->getBodyParam('settings', []);

        $settings->setAttributes($postedSettings, false);

        if (!$settings->validate()) {
            Craft::$app->getSession()->setError(Craft::t('craft-lottie', "Couldn't save settings."));
            return null;
        }

        $result = Craft::$app->getPlugins()->savePluginSettings($plugin, $settings->getAttributes());

        if ($result) {
            Craft::$app->getSession()->setNotice(Craft::t('craft-lottie', 'Settings saved.'));
        } else {
            Craft::$app->getSession()->setError(Craft::t('craft-lottie', "Couldn't save settings."));
        }

        return $this->redirectToPostedUrl();
    }
}
