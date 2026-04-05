package config

import (
	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string `env:"DATABASE_URL" envDefault:"postgresql://spaces:spaces@localhost:5432/spaces?sslmode=disable"`
	RedisURL       string `env:"REDIS_URL" envDefault:"redis://localhost:6379"`
	ServerPort     string `env:"SERVER_PORT" envDefault:"8080"`
	ClerkSecretKey string `env:"CLERK_SECRET_KEY"`
	// ClerkPublishableKey is shared with the frontend — matches NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env
	ClerkPublishableKey string `env:"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"`
	CORSOrigin     string `env:"CORS_ORIGIN" envDefault:"http://localhost:3000"`
	LogLevel       string `env:"LOG_LEVEL" envDefault:"info"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
