package main

import (
	"os"
	"strconv"

	"go.uber.org/zap"
)

type Config struct {
	Port            string
	SupabaseURL     string
	SupabaseAnonKey string
	JWTSecret       string
	RedisURL        string
	RateLimitRPM    int
	CronSecret      string
	AllowedOrigins  []string
}

func loadConfig(log *zap.Logger) Config {
	rpm := 60
	if v := os.Getenv("RATE_LIMIT_RPM"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			rpm = n
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	supabaseURL := requireEnv("SUPABASE_URL", log)
	jwtSecret   := requireEnv("SUPABASE_JWT_SECRET", log)

	origins := []string{
		"https://echoself.app",
		"https://www.echoself.app",
		"https://app.echoself.app",
	}
	if dev := os.Getenv("ALLOWED_ORIGINS"); dev != "" {
		origins = append(origins, dev)
	}

	return Config{
		Port:            port,
		SupabaseURL:     supabaseURL,
		SupabaseAnonKey: os.Getenv("SUPABASE_ANON_KEY"),
		JWTSecret:       jwtSecret,
		RedisURL:        os.Getenv("REDIS_URL"),
		RateLimitRPM:    rpm,
		CronSecret:      os.Getenv("CRON_SECRET"),
		AllowedOrigins:  origins,
	}
}

func requireEnv(key string, log *zap.Logger) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatal("required environment variable not set", zap.String("key", key))
	}
	return v
}
