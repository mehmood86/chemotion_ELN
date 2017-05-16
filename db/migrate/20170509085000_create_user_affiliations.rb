class CreateUserAffiliations < ActiveRecord::Migration
  def change
    create_table :user_affiliations do |t|
      t.integer :user_id
      t.integer :affiliation_id

      t.timestamps
    end
  end
end
