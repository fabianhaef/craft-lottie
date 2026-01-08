<?php

namespace vu\craftlottie\migrations;

use Craft;
use craft\db\Migration;

/**
 * m260108_000000_add_speed_to_lottie_metadata migration.
 */
class m260108_000000_add_speed_to_lottie_metadata extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Check if speed column already exists
        if (!$this->db->columnExists('{{%lottie_metadata}}', 'speed')) {
            $this->addColumn('{{%lottie_metadata}}', 'speed', $this->decimal(3, 1)->defaultValue(1.0)->after('backgroundColor'));
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        if ($this->db->columnExists('{{%lottie_metadata}}', 'speed')) {
            $this->dropColumn('{{%lottie_metadata}}', 'speed');
        }

        return true;
    }
}
