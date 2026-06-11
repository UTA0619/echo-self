-- Migration 001: Enable required PostgreSQL extensions
-- Run first — other migrations depend on these

create extension if not exists "uuid-ossp";      -- uuid_generate_v4()
create extension if not exists "pgcrypto";       -- gen_random_uuid(), crypt()
create extension if not exists "vector";         -- pgvector for memory embeddings
create extension if not exists "pg_trgm";        -- trigram search for text search
create extension if not exists "btree_gist";     -- GiST index support
