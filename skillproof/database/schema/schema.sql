-- SKILLPROOF Relational Database Schema DDL (MariaDB / MySQL 8.0 Compatible)
CREATE DATABASE IF NOT EXISTS `skillproof_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `skillproof_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('DEVELOPER', 'RECRUITER', 'ADMIN') NOT NULL DEFAULT 'DEVELOPER',
  `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `headline` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `location` VARCHAR(150) NULL,
  `profile_image` VARCHAR(500) NULL,
  `github_url` VARCHAR(255) NULL,
  `linkedin_url` VARCHAR(255) NULL,
  `portfolio_url` VARCHAR(255) NULL,
  `years_experience` INT NOT NULL DEFAULT 0,
  `profile_completion` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Skills Table
CREATE TABLE IF NOT EXISTS `skills` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. User Skills Table
CREATE TABLE IF NOT EXISTS `user_skills` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `profile_id` VARCHAR(36) NOT NULL,
  `skill_id` VARCHAR(36) NOT NULL,
  `proficiency_level` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT') NOT NULL DEFAULT 'INTERMEDIATE',
  `verification_status` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
  `verified_at` DATETIME(3) NULL,
  `verified_by` VARCHAR(36) NULL,
  `verification_method` ENUM('ASSESSMENT', 'CERTIFICATION', 'PROJECT', 'DOCUMENT') NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `idx_user_skill_unique` (`profile_id`, `skill_id`),
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Projects Table
CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `profile_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `image` VARCHAR(500) NULL,
  `github_url` VARCHAR(255) NULL,
  `live_url` VARCHAR(255) NULL,
  `start_date` VARCHAR(50) NULL,
  `end_date` VARCHAR(50) NULL,
  `status` ENUM('COMPLETED', 'IN_PROGRESS', 'PLANNED') NOT NULL DEFAULT 'COMPLETED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Project Technologies Table
CREATE TABLE IF NOT EXISTS `project_technologies` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `project_id` VARCHAR(36) NOT NULL,
  `technology_name` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Education Table
CREATE TABLE IF NOT EXISTS `education` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `profile_id` VARCHAR(36) NOT NULL,
  `institution` VARCHAR(255) NOT NULL,
  `degree` VARCHAR(150) NOT NULL,
  `field_of_study` VARCHAR(150) NOT NULL,
  `start_date` VARCHAR(50) NOT NULL,
  `end_date` VARCHAR(50) NULL,
  `grade` VARCHAR(50) NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Certifications Table
CREATE TABLE IF NOT EXISTS `certifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `profile_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `issuer` VARCHAR(255) NOT NULL,
  `issue_date` VARCHAR(50) NOT NULL,
  `expiry_date` VARCHAR(50) NULL,
  `credential_id` VARCHAR(150) NULL,
  `credential_url` VARCHAR(255) NULL,
  `document_url` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Achievements Table
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `profile_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `date` VARCHAR(50) NULL,
  `issuer` VARCHAR(255) NULL,
  `url` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Assessments Table
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `skill_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `time_limit_minutes` INT NOT NULL DEFAULT 15,
  `passing_percentage` INT NOT NULL DEFAULT 70,
  `total_questions` INT NOT NULL DEFAULT 10,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Assessment Questions Table
CREATE TABLE IF NOT EXISTS `assessment_questions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `assessment_id` VARCHAR(36) NOT NULL,
  `question_text` TEXT NOT NULL,
  `code_snippet` TEXT NULL,
  `explanation` TEXT NULL,
  `points` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Assessment Options Table
CREATE TABLE IF NOT EXISTS `assessment_options` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `question_id` VARCHAR(36) NOT NULL,
  `option_text` TEXT NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Assessment Attempts Table
CREATE TABLE IF NOT EXISTS `assessment_attempts` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `assessment_id` VARCHAR(36) NOT NULL,
  `start_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `end_time` DATETIME(3) NULL,
  `total_questions` INT NOT NULL DEFAULT 0,
  `correct_answers` INT NOT NULL DEFAULT 0,
  `score` DOUBLE NOT NULL DEFAULT 0.0,
  `percentage` DOUBLE NOT NULL DEFAULT 0.0,
  `status` ENUM('IN_PROGRESS', 'PASSED', 'FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Assessment Answers Table
CREATE TABLE IF NOT EXISTS `assessment_answers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `attempt_id` VARCHAR(36) NOT NULL,
  `question_id` VARCHAR(36) NOT NULL,
  `selected_option_id` VARCHAR(36) NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`attempt_id`) REFERENCES `assessment_attempts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`selected_option_id`) REFERENCES `assessment_options`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Verification Requests Table
CREATE TABLE IF NOT EXISTS `verification_requests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `user_skill_id` VARCHAR(36) NOT NULL,
  `method` ENUM('ASSESSMENT', 'CERTIFICATION', 'PROJECT', 'DOCUMENT') NOT NULL,
  `status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `reviewer_id` VARCHAR(36) NULL,
  `rejection_reason` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_skill_id`) REFERENCES `user_skills`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Verification Documents Table
CREATE TABLE IF NOT EXISTS `verification_documents` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `verification_request_id` VARCHAR(36) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `file_size` INT NOT NULL,
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`verification_request_id`) REFERENCES `verification_requests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Recruiter Bookmarks Table
CREATE TABLE IF NOT EXISTS `recruiter_bookmarks` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `recruiter_id` VARCHAR(36) NOT NULL,
  `developer_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY `idx_recruiter_dev_bookmark` (`recruiter_id`, `developer_id`),
  FOREIGN KEY (`recruiter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`developer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'INFO',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `metadata` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Reports Table
CREATE TABLE IF NOT EXISTS `reports` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `reporter_id` VARCHAR(36) NOT NULL,
  `reported_user_id` VARCHAR(36) NOT NULL,
  `content_type` VARCHAR(100) NOT NULL,
  `content_id` VARCHAR(36) NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reported_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `metadata` TEXT NULL,
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

