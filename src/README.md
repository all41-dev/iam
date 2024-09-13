# iam.api

API for identity and access management

## Usage

The database for this tool is automatically created, it contains a basic user table with base information (email), if you want to add information, you can either :
    - Extend the model and adding your own fields, you can change the tableName in the decorator if you want to.
    - Run the sql script in sql_scripts/user_remove, then create your own user table with the correct fields, then re-create an index for user_group_member table.
