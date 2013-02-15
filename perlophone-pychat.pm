use strict; use utf8; use feature qw(say);
use POSIX qw(setsid strftime);
use Time::ParseDate;
use EV;
use AnyEvent::Handle;
use AnyEvent::Socket;
require bytes;


my $host = 'd.py-chat.tk';
my $port = 1984;
my $token = 'cdaa542f11c93fda1658c4f13f1dec97';
my $nick = '<**котофон**> ';

our ($xmms_playtime);
my ($connect, $hdl, $locked);
my $add_time = my $list_time = time();

sub pychat_cb {
	my ($cmd, $body) = @_;
	if ( $cmd == 3 or $cmd == 7 ) {
		say color('BOLD RED'), $body, color('RESET');
	} elsif ( $cmd == 5 ) {
		say '[img]', $body, '[/img]';
	} elsif ( $cmd == 1 ) {
		$body =~ m#<a href="event:insert,(\d+)">#s;
		my $msg_id = $1;
		if ( $body =~ m/#(art|tag|sim)([^\[\]]+)$/i && $list_time < time() && !$locked ) {
			runCommand('#'.$1.$2);
			$list_time = time()+rand(60*60);
			$locked = $msg_id;
		} elsif ( $body =~ m/#(add)([^\[\]]+)$/i && $add_time < time() && !$locked ) {
			runCommand('#'.$1.$2);
			$add_time = time()+rand(10*60);
			$locked = $msg_id;
		} elsif ( $body =~ m/#(skip|next|drop)/i && $xmms_playtime/1000 > 30 ) {
			runCommand('#'.$1);
			$locked = $msg_id;
		}
	}
}

sub pychat_connect {
	$connect = tcp_connect $host, $port, sub {
		$hdl = AnyEvent::Handle->new(fh => $_[0], on_error => sub {
			print "ошибка\n";
		}, on_read => sub {
			shift->unshift_read(chunk => 3, sub {
				my $len = bytes::substr $_[1], 0, 2; $len = unpack 'n', $len;
				my $cmd = ord bytes::substr $_[1], 2, 1;
				shift->unshift_read(chunk => $len, sub {
					utf8::decode($_[1]);
					pychat_cb($cmd, $_[1]);
				});
			});
		});
		$hdl->push_write('<handshake version=1 token='.$token.'/>');
	};
}

sub pychat_answ {
	use bytes;
	return unless $locked;
	$hdl->push_write($nick.'>>'.$locked.' '.$_[0]);
	undef $locked;
}

sub pychat_unlock {
	say color('BOLD RED'), 'pychat_unlock', color('RESET');
	undef $locked;
}

sub pychat_write {
	$hdl->push_write($_[0]);
}

sub pychat_close {
	$hdl->push_shutdown();
}

addEvent('mode_success', \&pychat_answ, 'Спасибо, список треков добавлен в очередь воспроизведения.');
addEvent('mode_fail', \&pychat_unlock);

addEvent('add_success', \&pychat_answ, 'Спасибо, трек добавлен в очередь воспроизведения.');
addEvent('add_fail', \&pychat_unlock);





1;

