Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-22.04"
  config.vm.network "private_network", ip: "192.168.33.10"
  config.vm.network "forwarded_port", guest: 80, host: 8080  
  config.vm.network "forwarded_port", guest: 9090, host: 9090  
  config.vm.network "forwarded_port", guest: 3000, host: 3000  
  config.vm.provision "shell", inline: <<-SHELL
    # Instalar Docker según procedimientos oficiales
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker vagrant

  SHELL

  config.vm.synced_folder ".", "/vagrant"
end
