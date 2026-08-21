.PHONY: up build down logs ps clean restart

# Inicia os containers
up:
	docker-compose up -d

# Reconstrói as imagens 
build:
	docker-compose up -d --build

# Para e remove os containers
down:
	docker-compose down

# Exibe os logs 
logs:
	docker-compose logs -f

# Verifica o processo dos containers 
ps:
	docker-compose ps

# Remove tudo
clean:
	docker-compose down -v --rmi all --remove-orphans

# Reinicia tudo do zero 
restart: down build