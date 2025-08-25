#!/bin/bash

bun install
bun run build
sudo rm -rf /var/www/quantum-doc
sudo mv dist /var/www/quantum-doc
sudo chown -R www-data:www-data /var/www/quantum-doc