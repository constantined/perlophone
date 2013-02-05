use strict; use warnings; use utf8; use feature 'say';
use AnyEvent::HTTP::Server;
use AnyEvent::HTTP::Server::Action::Chain;
use AnyEvent::HTTP::Server::Action::Static;
use HTML::FromANSI;
use Data::Dumper;


my $host = '127.0.0.1';
my $port = 7654;


my $root = $ENV{'BASE'}.'webconsole/';
my $STDOUT = *STDOUT;

#$HTML::FromANSI::Options{style} = 'color:black;background:white;';

our $server = AnyEvent::HTTP::Server->new(
	host => $host,
	port => $port,
	request => AnyEvent::HTTP::Server::Action::Chain->new(
		root => $root,
		chain => [ sub {
			my $r = shift;
			#my $rpath = $r->{uri}->path();
			if ($r->wants_websocket) {
				$r->upgrade('websocket', sub {
					my ($ws, $pipe, $handle);
					if ($ws = shift) {
						undef *STDOUT;
						pipe $pipe, *STDOUT;
						binmode $pipe, ':utf8';
						binmode STDOUT, ':utf8';
						$| = 1;
						$handle = AnyEvent::Handle->new(fh => $pipe, on_read => sub {
							shift->push_read(sub {
								$_[0]->{rbuf} =~ s#\n#[br]#sg;
								my $str = ansi2html $_[0]->{rbuf};
								$str =~ s#<span[^<>]*?><br></span>##g;
								$str =~ s#\[br\]#<br>#g;
								$str =~ s#\[img\]#<img src="#g;
								$str =~ s#\[/img\]#">#g;
								$ws->send($str);
								undef $_[0]->{rbuf};
							});
						}, on_error => sub {});
						$ws->onmessage(sub {
							my ($msg) = @_;
							$msg =~ s#[–]#-#sg;
							run_command($msg, 1);
						});
						$ws->onclose(sub {
							*STDOUT = $STDOUT;
							$| = 1;
							$handle->push_shutdown();
						});
					}
				});
				return 1;
			} else {
				return 0;
			}
		}, AnyEvent::HTTP::Server::Action::Static->new($root) ]
	)
)->start();



1;

