create table iam_scope
(
    uuid  char(36)     not null default uuid(),
    name  varchar(100) not null,
    code char(36)   not null,
    parent_uuid char(36) null,
    constraint scope_pk
        primary key (uuid),
    constraint scope_scope_uuid_fk
        foreign key (parent_uuid) references scope (uuid)
);

create table iam_auth_user
(
    uuid  char(36)     not null default uuid(),
    username varchar(100) not null,
    email varchar(100) not null,
    first_name varchar(50),
    last_name varchar(50),
    provider varchar(50) default 'local',
    validated boolean DEFAULT false NOT NULL;
    constraint auth_user_pk
        primary key (uuid)
);

create table iam_user_group
(
    uuid  char(36)     not null default uuid(),
    name  varchar(100) not null,
    scope_uuid char(36) not null,
    scope_element_uuid char(36) not null,
    createdAt timestamp not null default current_timestamp,
    updatedAt timestamp not null default current_timestamp,
    constraint user_group_scope_uuid_fk
        foreign key (scope_uuid) references scope (uuid),
    constraint user_group_pk
        primary key (uuid)
);

create table iam_user_group_member
(
    uuid char(36)     not null default uuid(),
    auth_user_uuid char(36) not null,
    group_uuid char(36) not null,
    constraint user_group_member_user_uuid_fk
        foreign key (auth_user_uuid) references auth_user (uuid),
    constraint user_group_member_group_uuid_fk
        foreign key (group_uuid) references user_group (uuid),
    constraint user_group_member_pk
        primary key (uuid),
    constraint unique_group_member
        unique (auth_user_uuid, group_uuid)
);

create table iam_feature
(
    uuid  char(36)     not null default uuid(),
    name  varchar(100) not null,
    scope_uuid char(36) not null,
    createdAt timestamp not null default current_timestamp,
    code char(36)   not null,
    updatedAt timestamp not null default current_timestamp,
    constraint scope_element_uuid_fk
        foreign key (scope_uuid) references scope (uuid),
    constraint feature_pk
        primary key (uuid)
);

create table iam_feature_composition
(
    uuid char(36)     not null default uuid(),
    child_uuid char(36) not null,
    parent_uuid char(36) not null,
    constraint feature_composition_child_uuid_fk
        foreign key (child_uuid) references feature (uuid),
    constraint feature_composition_parent_uuid_fk
        foreign key (parent_uuid) references feature (uuid),
    constraint feature_composition_pk
        primary key (uuid),
    constraint unique_feature_composition
        unique (child_uuid, parent_uuid)
);

create table iam_permission
(
    uuid  char(36)     not null default uuid(),
    is_deny boolean not null default false,
    scope_element_uuid char(36) not null,
    group_uuid char(36) not null,
    feature_uuid char(36) not null,
    createdAt timestamp not null default current_timestamp,
    updatedAt timestamp not null default current_timestamp,
    constraint permission_scope_element_uuid_fk
        foreign key (feature_uuid) references feature (uuid),
    constraint permission_group_uuid_fk
        foreign key (group_uuid) references user_group (uuid),
    constraint permission_pk
        primary key (uuid)
);

CREATE TABLE iam_refreshToken (
    uuid VARCHAR(36) PRIMARY KEY DEFAULT uuid() NOT NULL,
    userUuid VARCHAR(36) NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updatedAt TIMESTAMP NOT NULL DEFAULT current_timestamp(),

    CONSTRAINT fk_refreshToken_authUserUuid FOREIGN KEY (auth_user_uuid) REFERENCES auth_user (uuid)
)