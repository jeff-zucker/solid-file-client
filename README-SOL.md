# Sol

**a command-line and interactive shell for managing Solid PODs**

## Installation

For now, sol is part of the solid-file-client package, download and
install it and sol will be installed too.

If you use npm to install (recommended) and you use the -g option, the
sol executable will be installed so that it can be run from anywhere,
otherwise it can be run from its local directory.

## Credentials file

You will need to create a solid-credentials.json file in the folder where
you run sol.  See the solid-file-client README for details.

## Command-line usage

For one-off commands, you can run sol commands directly. For example this
uploads two files and the contents of a folder to a Solid POD.

   sol upload /someRemotePath file1 file2 folder/*

Enter sol -h to see a full list of commands available from the command line.

## Interactive shell usage

Enter the shell like so:

    sol shell

Once in the shell, enter "help" to see a list of commands available in the shell.