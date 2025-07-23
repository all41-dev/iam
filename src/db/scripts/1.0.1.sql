START TRANSACTION;

INSERT INTO iam_scope (uuid, name, code, parent_uuid)
VALUES
    (UUID(), 'Global', 'global-1iam', null);

INSERT INTO iam_feature (uuid, name, scope_uuid, code)
VALUES
    (UUID(), 'Write Rights', (SELECT uuid FROM iam_scope WHERE code = 'global-1iam'), 'global-write-rights'),
    (UUID(), 'Show Rights', (SELECT uuid FROM iam_scope WHERE code = 'global-1iam'), 'global-read-show-rights');


INSERT INTO iam_feature_composition (uuid, parent_uuid, child_uuid)
VALUES
    (UUID(), (SELECT uuid FROM iam_feature WHERE code = 'global-write-rights'), (SELECT uuid FROM iam_feature WHERE code = 'global-read-show-rights'));

INSERT INTO iam_user_group (uuid, name,scope_uuid, scope_element_uuid )
VALUES
    (UUID(), 'Global', (SELECT uuid FROM iam_scope WHERE code = 'global-1iam'),'00000000-0000-0000-0000-000000000000');

INSERT INTO iam_permission (uuid, is_deny,scope_element_uuid, group_uuid, feature_uuid )
VALUES
    (UUID(), false, '00000000-0000-0000-0000-000000000000',(SELECT uuid FROM iam_user_group WHERE name = 'Global') , (SELECT uuid FROM iam_feature WHERE code = 'global-write-rights'));

COMMIT;
