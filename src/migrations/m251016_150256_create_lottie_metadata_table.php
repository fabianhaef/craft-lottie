<?php

namespace vu\craftlottie\migrations;

use craft\db\Migration;

/**
 * m251016_150256_create_lottie_metadata_table migration.
 */
class m251016_150256_create_lottie_metadata_table extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        $this->createTable('{{%lottie_metadata}}', [
            'id' => $this->primaryKey(),
            'assetId' => $this->integer()->notNull(),
            'backgroundColor' => $this->string(7)->null(),
            'dateCreated' => $this->dateTime()->notNull(),
            'dateUpdated' => $this->dateTime()->notNull(),
            'uid' => $this->uid(),
        ]);

        $this->createIndex(null, '{{%lottie_metadata}}', 'assetId', true);
        $this->addForeignKey(null, '{{%lottie_metadata}}', 'assetId', '{{%assets}}', 'id', 'CASCADE');

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists('{{%lottie_metadata}}');
        return true;
    }
}
