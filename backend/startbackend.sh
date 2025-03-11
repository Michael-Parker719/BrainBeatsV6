#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo ".env file not found. Exiting."
    exit 1
fi

# install modules
sudo npm i

# Check if there exists "brainbeats" database
# if not, we need to make it
RESULT=`sudo mysqlshow -u root -p$MYSQL_PASSWORD brainbeatsv6 | grep -v Wildcard | grep -o brainbeatsv6`
if [ "$RESULT" != "brainbeatsv6" ]; then
    echo "brainbeatsv6 database not found."

    while true; do
        read -p "Allow the script to create it? (Y/n) " yn
        case $yn in
            [Yy]* ) echo "running > mysql -e CREATE DATABASE brainbeatsv6\n"; break;;
            [Nn]* ) echo "exiting"; exit;;
            * ) echo "Please answer yes or no.";;
        esac
    done

    sudo mysql -u root -p$MYSQL_PASSWORD -e "CREATE DATABASE brainbeatsv6"
    sudo mysql -u root -p$MYSQL_PASSWORD -e "CREATE USER 'brainbeatsv6_root'@'localhost' IDENTIFIED BY ''"
    sudo mysql -u root -p$MYSQL_PASSWORD -e "GRANT ALL ON brainbeatsv6.* TO 'brainbeatsv6_root'@'localhost'"
else
    echo "brainbeatsv6 database found, continuing."
fi

# Check if .env file exists
if ! [ -f .env ]; then
    echo ".env file not found."

    while true; do
        read -p "Allow the script to create it? (Y/n) " yn
        case $yn in
            [Yy]* ) echo "creating .env file"; break;;
            [Nn]* ) echo "exiting"; exit;;
            * ) echo "Please answer yes or no.";;
        esac
    done

    echo "DATABASE_URL=mysql://brainbeatsv6_root@localhost:3306/brainbeatsv6" > .env
    echo "JWT_KEY=secret" >> .env
else
    echo ".env file found, continuing."
fi

# Check if the schema file exists
SCHEMA_FILE="brainbeats_schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "$SCHEMA_FILE not found. Please ensure the schema file exists in the current directory."
    exit 1
fi

# Import the schema file into the database
echo "Importing schema into the brainbeatsv6 database..."

# Import the schema using MySQL
sudo mysql -u root -p$MYSQL_PASSWORD brainbeatsv6 < "$SCHEMA_FILE"

# Check if the schema import was successful
if [ $? -eq 0 ]; then
    echo "Schema imported successfully."
else
    echo "Error during schema import."
    exit 1
fi

# Run the backend server 
echo "Starting the backend..."
sudo npm run dev
