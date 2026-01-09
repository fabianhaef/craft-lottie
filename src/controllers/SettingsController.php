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

        // Encode brand palette as JSON for JavaScript
        $brandPaletteJson = \craft\helpers\Json::encode($settings->brandPalette ?? []);

        return $this->renderTemplate('craft-lottie/settings', [
            'plugin' => $plugin,
            'settings' => $settings,
            'brandPaletteJson' => $brandPaletteJson,
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

        // Normalize volume ID to integer or null
        if (isset($postedSettings['lottieVolumeId'])) {
            $volumeId = $postedSettings['lottieVolumeId'];
            if ($volumeId === '' || $volumeId === null) {
                $postedSettings['lottieVolumeId'] = null;
            } else {
                $postedSettings['lottieVolumeId'] = (int)$volumeId;
                // Volume IDs in Craft CMS are positive integers starting from 1
                if ($postedSettings['lottieVolumeId'] <= 0) {
                    $postedSettings['lottieVolumeId'] = null;
                }
            }
        } else {
            $postedSettings['lottieVolumeId'] = null;
        }

        // Normalize brand palette
        if (isset($postedSettings['brandPalette']) && is_array($postedSettings['brandPalette'])) {
            // Filter out empty values and normalize hex colors
            $postedSettings['brandPalette'] = array_filter(
                array_map(function($color) {
                    $color = trim($color);
                    // Ensure color starts with #
                    if ($color && !str_starts_with($color, '#')) {
                        $color = '#' . $color;
                    }
                    return strtoupper($color);
                }, $postedSettings['brandPalette']),
                function($color) {
                    return !empty($color) && preg_match('/^#[0-9A-Fa-f]{6}$/', $color);
                }
            );
            $postedSettings['brandPalette'] = array_values($postedSettings['brandPalette']); // Re-index
        } else {
            $postedSettings['brandPalette'] = [];
        }

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
