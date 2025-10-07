<?php

namespace vu\craftcraftlottie\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;

/**
 * Default controller for the Craft Lottie plugin
 */
class DefaultController extends Controller
{
    /**
     * @var bool Whether to allow anonymous access
     */
    protected array|bool|int $allowAnonymous = false;

    /**
     * Main index action
     */
    public function actionIndex(): Response
    {
        return $this->renderTemplate('craft-lottie/index', [
            'title' => 'Lottie Animator',
        ]);
    }
}
