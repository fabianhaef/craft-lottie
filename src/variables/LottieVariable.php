<?php

namespace vu\craftcraftlottie\variables;

use vu\craftcraftlottie\Plugin;

class LottieVariable
{
    public function render($fieldValue, array $options = [])
    {
        return Plugin::getInstance()->getLottieService()->render($fieldValue, $options);
    }
}