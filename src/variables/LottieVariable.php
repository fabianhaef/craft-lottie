<?php

namespace vu\craftlottie\variables;

use vu\craftlottie\Plugin;

class LottieVariable
{
    public function render($fieldValue, array $options = [])
    {
        return Plugin::getInstance()->getLottieService()->render($fieldValue, $options);
    }
}
