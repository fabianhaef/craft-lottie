<?php

namespace vu\craftlottie\migrations;

use Craft;
use craft\db\Migration;

/**
 * m260109_000000_add_interactions_to_lottie_metadata migration.
 */
class m260109_000000_add_interactions_to_lottie_metadata extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Check if interactions column already exists
        if (!$this->db->columnExists('{{%lottie_metadata}}', 'interactions')) {
            $this->addColumn('{{%lottie_metadata}}', 'interactions', $this->text()->null()->after('speed'));
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        if ($this->db->columnExists('{{%lottie_metadata}}', 'interactions')) {
            $this->dropColumn('{{%lottie_metadata}}', 'interactions');
        }

        return true;
    }
}
