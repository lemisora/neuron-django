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
  ];

  # https://devenv.sh/languages/
  # languages.rust.enable = true;

  # JavaScript para la versión web de Jupyter
  languages.javascript.enable = true;

  # https://devenv.sh/processes/
  # processes.cargo-watch.exec = "cargo-watch";

  # https://devenv.sh/services/
  # services.postgres.enable = true;

  enterShell = ''
    conda-shell -c "python --version"
    conda-shell -c "conda --version"
  '';

  scripts = {
    prepare-env = {
      exec = ''
        echo 'Iniciando preparación del entorno myenv...'
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
        echo 'Iniciando instalación de Jupyter Lab...'
        conda-shell -c "
          conda install -n myenv -c anaconda django -y
        "
      '';
      description = "Instala Django";
    };
  };

  processes = {
    "jupyter-lab".exec = ''
      conda-shell -c "
        conda activate myenv
        jupyter lab
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
