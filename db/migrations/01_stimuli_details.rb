Sequel.migration do
  up do
    alter_table(:stimuli) do
      add_column :details, String, :text => true
    end
  end

  down do
    alter_table(:stimuli) do
      drop_column :details
    end
  end
end