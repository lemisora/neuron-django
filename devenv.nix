{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.conda
    pkgs.tailwindcss_3
  ];

  # https://devenv.sh/languages/
  # languages.rust.enable = true;

  # JavaScript para paquetes npm
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
    npm.install.enable = false;
  };

  # https://devenv.sh/processes/
  # processes.cargo-watch.exec = "cargo-watch";

  # https://devenv.sh/services/
  # services.postgres.enable = true;

  enterShell = ''
    # Añade la carpeta de binarios local a tu PATH
    export PATH="$PWD/node_modules/.bin:$PATH"

    echo "✅ Entorno de Django y Node listo."
    echo "🔧 Node: $(node -v) | npm: $(npm -v)"
  '';

  scripts = {
    prepare-env = {
      exec = ''
        echo 'Iniciando preparación del entorno django-env...'
        conda-shell -c "
          echo 'Creando el entorno myenv con Python 3.13...'
          conda create -n django-env python=3.13 anaconda -y
          echo 'Configuración completada exitosamente!'
        "
        echo 'Entorno django-env preparado y listo para usar!'
      '';
      description = "Prepara el entorno conda django-env con todas las librerías necesarias";
    };

    install-django = {
      exec = ''
        echo 'Iniciando instalación de Django...'
        conda-shell -c "
          conda install -n django-env -c anaconda django -y
        "
      '';
      description = "Instala Django";
    };

    tailwindcss-serve.exec = ''
      tailwindcss -i ./assets/css/input.css -o ./src/static/css/output.css --watch
    '';
  };

  processes = {
    "server".exec = ''
      conda-shell -c "
        conda activate django-env
        cd src
        python manage.py runserver
      "
    '';
  };

  # https://devenv.sh/tasks/
  # tasks = {
  #   "myproj:setup".exec = "mytool build";
  #   "devenv:enterShell".after = [ "myproj:setup" ];
  # };

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running tests"
    git --version | grep --color=auto "${pkgs.git.version}"
  '';

  # https://devenv.sh/git-hooks/
  # git-hooks.hooks.shellcheck.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
