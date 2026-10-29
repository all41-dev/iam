-- Additive only. Rows issued before this script keep a null jti and no family; they are still
-- accepted until they expire, a day after the release at most.
ALTER TABLE iam_refresh_token
    ADD COLUMN IF NOT EXISTS jti CHAR(36) NULL,
    ADD COLUMN IF NOT EXISTS family_uuid CHAR(36) NULL,
    ADD COLUMN IF NOT EXISTS family_created_at DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS rotated_at DATETIME(3) NULL,
    ADD CONSTRAINT unique_refresh_token_jti UNIQUE (jti),
    ADD INDEX idx_refresh_token_user_expires (user_uuid, expires),
    ADD INDEX idx_refresh_token_expires (expires);

CREATE TABLE IF NOT EXISTS iam_auth_code
(
    code_hash              CHAR(64)      NOT NULL,
    user_uuid              CHAR(36)      NOT NULL,
    impersonate_user_email VARCHAR(100)  NULL,
    provider               VARCHAR(50)   NOT NULL,
    redirect_path          VARCHAR(2048) NOT NULL,
    expires                DATETIME(3)   NOT NULL,
    updatedBy              VARCHAR(36)   NULL DEFAULT (CURRENT_USER()),
    createdAt              DATETIME(3)   DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt              DATETIME(3)   DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT auth_code_pk
        PRIMARY KEY (code_hash),
    CONSTRAINT auth_code_user_uuid_fk
        FOREIGN KEY (user_uuid) REFERENCES iam_user (uuid),
    INDEX idx_auth_code_expires (expires)
);
