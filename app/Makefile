.PHONY: up build down logs ps clean restart

up:
	docker-compose up -d

build:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

ps:
	docker-compose ps

clean:
	docker-compose down -v --rmi all --remove-orphans

rebuild-hard:
	docker-compose build --no-cache
	docker-compose up -d

# Reinicia tudo do zero 
restart: down build