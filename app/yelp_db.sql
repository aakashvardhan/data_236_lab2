CREATE DATABASE IF NOT EXISTS yelp_db;
USE yelp_db;
-- Users
-- Single table for both "user" and "owner" roles
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'owner') NOT NULL DEFAULT 'user',
    -- Profile fields
    phone VARCHAR(20),
    about_me TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    -- abbreviation 
    country VARCHAR(100),
    languages VARCHAR(255),
    -- comma separated 
    gender VARCHAR(20),
    profile_picture VARCHAR(500),
    -- file path or URL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idex_email (email)
);
-- User Preferences (for AI Assistant)
-- One row per user, storing their dining preferences
-- so the chatbot can personalize recommendations
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    cuisines VARCHAR(500),
    -- "Indian, Chinese, Italian"
    price_range VARCHAR(20),
    -- "$", "$$", "$$$", "$$$$"
    preferred_locations VARCHAR(500),
    -- "San Jose, Santa Clara"
    dietary_needs VARCHAR(500),
    -- "Vegetarian, gluten-free"
    ambience VARCHAR(500),
    -- "casual, family-friendly"
    sort_preference VARCHAR(50),
    -- "rating" | "distance" | "popularity" | "price"
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Restaurants
-- owner_id is nullable: a restaurant can exist without an owner
CREATE TABLE IF NOT EXISTS restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT,
    -- null = unclaimed
    name VARCHAR(200) NOT NULL,
    cuisine_type VARCHAR(100),
    description TEXT,
    address VARCHAR(300),
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    contact_info VARCHAR(200),
    hours TEXT,
    -- JSON String or free text
    photos TEXT,
    -- comma-separated URLs
    pricing_tier VARCHAR(10),
    -- "quiet, wifi, outdoor seating"
    avg_rating FLOAT DEFAULT 0.0,
    review_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_city (city),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
-- Reviews
-- One review per user per restaurant (enforced by unique constraints)
-- Rating is 1-5 stars
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    rating INT NOT NULL CHECK (
        rating BETWEEN 1 and 5
    ),
    comment TEXT,
    photos TEXT,
    -- comma-separated URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_restaurant_review (user_id, restaurant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
-- Favorites
-- Simple junction table. One favorite per user per restaurant.
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_restaurant_favorite (user_id, restaurant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);