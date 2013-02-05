#!/usr/bin/perl -w
BEGIN { $ENV{'BASE'} = $ENV{'_'} =~ s#[^/]*$##r; unshift(@INC, $ENV{'BASE'}); }

use strict; use utf8; use feature qw(say switch); use Fcntl;
use URI::Escape;
use EV;
use AnyEvent::HTTP;
use Audio::XMMSClient::AnyEvent;
use AnyEvent::LastFM;
use JSON::XS;
use MP3::Tag;
use Term::ANSIColor;
use Data::Dumper;


$| = 1;
binmode STDOUT, ':utf8';
binmode STDERR, ':utf8';

AnyEvent::HTTP::set_proxy 'http://127.0.0.1:3128/';

$ENV{MP3TAG_DECODE_UNICODE} = 1;
$ENV{MP3TAG_DECODE_UTF8} = 1;
MP3::Tag->config(write_v24 => 1);


our ($limit, $prefetch_count, $xmms_end_foresight, $xmms_socket, $lastfm_key, $settings,
	$music_path, $music_max_files);
require config;


mkdir $music_path unless -d $music_path;


my $cmds = {
	art => \&art,
	tag => \&tag,
	sim => \&sim,
	add => \&add,
	skip => \&skip,
	next => \&skip,
	drop => \&skip,
};
our ($s, $xmms_playtime);
my ($lastfm, $xmms, $mode_count, $mode_unic, $mode_unic_play, $playback_status, $tag, $artist,
	$track, $xmms_id_changed, $xmms_duration,
	@find_queue, @play_queue, %events, %searchers, %found_urls);
my $mode_status = 0;



###===--- EVENTS ---===###
sub addEvent {
	my ($name, $sub, $data) = @_;
	push @{$events{$name}},[$sub,$data] if ref $sub eq 'CODE';
}
sub existsEvent {
	my ($name) = @_;
	return $events{$name}?1:0;
}
sub countEvents {
	my ($name) = @_;
	return scalar @{$events{$name}};
}
sub fireEvent {
	my ($name, $data) = @_;
	for my $event ( @{$events{$name}} ) {
		if ( defined $data ) {
			while ( my ($k,$v) = each %{$data} ) {
				$event->[1]->{$k} = $v;
			}
		}
		$event->[0]->($event->[1]);
	}
}

# просто полезные функции
sub trim {
	my ($str) = @_;
	$str =~ s#^\s*(.*?)\s*$#$1#s;
	return $str;
}
sub canonical {
	my ($str) = @_;
	$str =~ s#^[^\w]*(.*?)[^\w]*$#$1#s; # trim
	$str =~ s#[^\w]+#_#sg; # replaces every [^w]+ with _
	return uc $str;
}
sub canonical_s {
	my ($str) = @_;
	$str =~ s#^[^\w]*(.*?)[^\w]*$#$1#s; # trim
	$str =~ s#[^\w]+# #sg; # replaces every [^w]+ with _
	return uc $str;
}
sub countNonEmpty {
	my ($ref) = @_;
	return scalar(grep {$_} @$ref);
}
sub mysub {
	return ([caller(1)]->[3] =~ s#.*::##r);
}
sub file_write {
	my ($filename, $body) = @_;
	sysopen my $FILE, $filename, O_CREAT|O_WRONLY;
	print $FILE $body;
	close $FILE;
}


# xmms2-специфические функции
sub xmms_stat {
	$playback_status = shift;
	return 1;
}
sub xmms_curr {
	my ($id) = @_;
	$xmms->medialib_get_info($id)->notifier_set(sub {
		my ($info) = @_;
		$xmms_duration = [values %{$info->{duration}}]->[0];
		$xmms_id_changed = 1;
		return 1;
	});
	return 1;
}
sub xmms_playtime {
	$xmms_playtime = shift;
	if ( $xmms_id_changed && ($xmms_duration - $xmms_playtime)/1000 < $xmms_end_foresight ) {
		$xmms->playlist->list_entries->notifier_set(sub {#получение числа треков в плейлисте
			my ($data) = @_;
			if ( @$data <= 1 ) {
				playNextFile();
			}
		});
		$xmms_id_changed = 0;
	}
	return 1;
}


sub loadSaveSettings {
	use bytes;
	open(my $FILE, '+<', $settings);
	if ( $s ) {
		syswrite $FILE, JSON::XS->new->pretty->encode($s);
	} else {
		local $/;
		$s = decode_json(<$FILE> or '{}');
	}
	close $FILE;
}
sub cleanMusicDir {
	for my $file (
		splice([sort {(stat $a)[8] <=> (stat $b)[8]} glob $music_path.'*'], 0, -$music_max_files)
	  ) {
		unlink $file;
	}
}
sub addToPlayQueue {
	my ($filename) = @_;
	if ( $mode_status == 1 ) { # опасный момент, @play_queue может оказаться пустым
		$mode_status++;
		$mode_unic_play = $mode_unic;
		undef @play_queue;
	}
	push @play_queue, $filename;
	if ( countNonEmpty(\@play_queue) < $prefetch_count ) {
		&findNextFile();
	} elsif ( $mode_status == 2 ) { #стадия инициализации режима завершена
		$mode_status = 0;
		$xmms->playlist->list_entries->notifier_set(sub {#получение числа треков в плейлисте
			my ($data) = @_;
			if ( @$data == 0 ) { # в плейлисте 0 треков playNextFile не выполнится по событию
				&playNextFile();
			} elsif ( @$data == 1 && !$playback_status ) { # воспр. было остановлено
				$xmms->playlist->clear->notifier_set(sub {
					&playNextFile();
					return 1;
				});
			}
			return 1;
		});
	}
}
sub findNextFile {
	my ($to_playlist) = @_;
	unless ( @find_queue ) {
		say 'unless @find_queue';
		$cmds->{$s->{mode}}->();
		return;
	}
	my ($artist, $title) = @{shift @find_queue};
	say $artist, ' - ', $title;
	my $unic = canonical($artist).'-'.canonical($title);
	my $filename = $unic.'.mp3';
	if ( -e $music_path.$filename ) {
		say color('GREEN'), 'FOUND IN CACHE: ', $filename, color('RESET');
		addToPlayQueue($filename);
	} else {
		$searchers{$unic} = countEvents('find_file');
		$found_urls{$unic} = [];
		fireEvent('find_file', {
			artist => $artist,
			title => $title,
			unic => $unic,
			to_playlist => $to_playlist
		});
	}
}
addEvent('file_found', sub {
	my $artist = $_[0]->{artist};
	my $title = $_[0]->{title};
	my $unic = $_[0]->{unic};
	my $urls = $_[0]->{urls};
	my $to_playlist = $_[0]->{to_playlist};
	my $filename = $unic.'.mp3';
	$searchers{$unic}--;
	push $found_urls{$unic}, @$urls if $urls;
	unless ( $searchers{$unic} ) {
		if ( @{$found_urls{$unic}} ) {
			my $url = shift $found_urls{$unic};
			http_get $url, headers => {'Referer' => undef},  sub {
				file_write($music_path.$filename, $_[0]);
				undef $_[0];
				my $mp3 = MP3::Tag->new($music_path.$filename);
				$mp3->get_tags();
				$mp3->{ID3v1}->remove_tag() if exists $mp3->{ID3v1};
				$mp3->{ID3v2}->remove_tag() if exists $mp3->{ID3v2};
				$mp3->new_tag('ID3v2');
				$mp3->artist_set($artist, 1);
				$mp3->title_set($title, 1);
				$mp3->{ID3v2}->write_tag(1);
				say color('GREEN'), 'FOUND: ', $filename, color('RESET');
				if ( $to_playlist ) {
					$xmms->playlist->add_url('file://'.$music_path.$filename)->notifier_set(sub {
						say color('BOLD CYAN'), 'ADDED TO PLAYLIST: ', color('RESET'), $filename;
						$xmms->playback_start() unless $playback_status;
					});
				} else {
					addToPlayQueue($filename);
				}
			};
		} else {
			say color('BOLD RED'), 'NOT FOUND: ', $filename, color('RESET');
			addToPlayQueue('') unless $to_playlist;
		}
		undef $found_urls{$unic};
		undef $searchers{$unic};
	}
});
sub playNextFile {
	my ($on_success) = @_;
	my $file;
	while (@play_queue) {
		$file = shift @play_queue;
		$s->{$s->{mode}}->{$mode_unic_play}++;
		last if $file;
	}
	unless ( $file ) {
		say color('BOLD RED'), '@play_queue is empty !!!', color('RESET');
		return 1;
	}
	$xmms->playlist->add_url('file://'.$music_path.$file)->notifier_set(sub {
		#print Dumper \@_;
		$on_success->() if $on_success;
		say color('BOLD CYAN'), 'ADDED TO PLAYLIST: ', color('RESET'),
			$s->{$s->{mode}}->{$mode_unic_play}, '. ', $file;
		$xmms->playback_start() unless $playback_status;
		loadSaveSettings();
		findNextFile();
	});
	return 1;
}
sub modeCallback {
	my ($result, $input) = @_;
	if ($input && $mode_status) {
		fireEvent('mode_fail');
		return;
	}
	if ( $input ) {
		if ( $result ) {
			$mode_status = 1;
			$s->{mode} = $input->{mode};
			$s->{mode_input} = $input->{input};
			$mode_unic = $input->{unic};
			$s->{$s->{mode}} ||= {};
			$s->{$s->{mode}}->{$mode_unic} ||= 0;
			$mode_count = $s->{$s->{mode}}->{$mode_unic};
			undef @find_queue;
			fireEvent('mode_success');
		} else {
			fireEvent('mode_fail');
			return;
		}
	}
	my $remainder = $mode_count % $limit;
	my $i = 0; for my $track ( @$result ) {
		if ($i >= $remainder) {
			say color('GREEN'), $track->{'@attr'}->{rank}, '. ', $track->{artist}->{name},
				' - ', $track->{name}, color('RESET');
			push @find_queue, [$track->{artist}->{name}, $track->{name}];
			$mode_count++;
		}
		$i++;
	}
	findNextFile(); # вызывается и при смене режима, и при запросе новых названий треков
}
sub art {
	my $input = shift;
	if ($input && $mode_status) {
		fireEvent('mode_fail');
		return;
	}
	my ($mode, $count, $cb_inp);
	if ( $input ) {
		$mode = mysub();
		$count = ($s->{$mode}->{$input} or 0);
		$cb_inp = {mode => $mode, input => $input, unic => $input};
	}
	$lastfm->request(
	  method => 'artist.getTopTracks',
	  artist => ($input or $s->{mode_input}),
	  page => int((defined($count)?$count:$mode_count) / $limit) + 1,
	  limit => $limit,
	  sub {
		my ($result) = @_;
		#print Dumper $result;
		modeCallback($result->{toptracks}->{track}, $cb_inp);
	});
}
sub tag {
	my $input = shift;
	if ($input && $mode_status) {
		fireEvent('mode_fail');
		return;
	}
	my ($mode, $count, $cb_inp);
	if ( $input ) {
		$mode = mysub();
		$count = ($s->{$mode}->{$input} or 0);
		$cb_inp = {mode => $mode, input => $input, unic => $input};
	}
	$lastfm->request(
	  method => 'tag.getTopTracks',
	  tag => ($input or $s->{mode_input}),
	  page => int((defined($count)?$count:$mode_count) / $limit) + 1,
	  limit => $limit,
	  sub {
		my ($result) = @_;
		modeCallback($result->{toptracks}->{track}, $cb_inp);
	});
}
sub sim {
	my ($input, $mode, $unic, $count, $cb_inp);
	$input = [@_] if @_;
	if ($input && $mode_status) {
		fireEvent('mode_fail');
		return;
	}
	if ( @{$input or $s->{mode_input}} == 1 ) {
		if ( $input ) {
			$mode = mysub();
			$unic = $input->[0];
			$count = ($s->{$mode}->{$unic} or 0);
			$cb_inp = {mode => $mode, input => $input, unic => $unic};
		}
		$lastfm->request(
		  method => 'track.getSimilar',
		  artist => $s->{mode_input}->[0],
		  track => $s->{mode_input}->[1],
		  page => int((defined($count)?$count:$mode_count) / $limit) + 1, # в документации нет такого
		  limit => $limit,
		  sub {
			my ($result) = @_;
			modeCallback($result->{similartracks}->{track}, $cb_inp);
		});
	} else {
		if ( $input ) {
			$mode = mysub();
			$unic = join('-', @{$input});
			$count = ($s->{$mode}->{$unic} or 0);
			$cb_inp = {mode => $mode, input => $input, unic => $unic};
		}
		$lastfm->request(
		  method => 'track.getSimilar',
		  artist => $s->{mode_input}->[0],
		  track => $s->{mode_input}->[1],
		  page => int((defined($count)?$count:$mode_count) / $limit) + 1, # в документации нет такого
		  limit => $limit,
		  sub {
			my ($result) = @_;
			modeCallback($result->{similartracks}->{track}, $cb_inp);
		});
	}
}
sub add {
	my ($artist, $track) = @_;
	say( $artist.' - '.$track );
	unshift @find_queue, [$artist, $track];
	findNextFile(1);
#			fireEvent('add_success');
#			fireEvent('add_fail');
}
sub skip {
	playNextFile(sub {
		$xmms->playlist_set_next_rel(1)->notifier_set(sub {
			$xmms->playback_tickle->notifier_set(sub {
				pychat_answ('Трек пропущен.');
				return 1;
			});
			return 1;
		});
	});
}
sub run_command {
	my ($cmd, $eval) = @_;
	if ($cmd =~ m/^#(art|tag|sim|add|skip|next|drop)(.*)$/i) {
		my $mode = lc $1;
		my $inp = $2;
		my @args = split /(?<!\\)[\x2D\x{2010}\x{2011}\x{2043}\x{207B}\x{208B}\x{FE63}\x{FF0D}]/,
			$inp;
		for my $arg ( @args ) {
			$arg = (trim($arg) =~ s#(?<!\\)\\##sgr);
		}
		if ( (@args == 0 && grep{$_ eq $mode}qw(skip next drop))
		  or (@args == 1 && grep{$_ eq $mode}qw(art tag sim))
		  or (@args == 2 && grep{$_ eq $mode}qw(sim add)) ) {
			$cmds->{$mode}->(@args);
		} elsif (!$eval) {
			pychat_unlock();
		}
	} elsif ($eval) {
		eval $cmd or print $@;
	}
}




loadSaveSettings();

$lastfm = AnyEvent::LastFM->new(api_key => $lastfm_key);

$xmms = Audio::XMMSClient::AnyEvent->new('perlophone');
$xmms->connect($xmms_socket) or die $xmms->get_last_error();

$xmms->playback_current_id->notifier_set(\&xmms_curr);
$xmms->broadcast_playback_current_id->notifier_set(\&xmms_curr);

$xmms->playback_status->notifier_set(\&xmms_stat);
$xmms->broadcast_playback_status->notifier_set(\&xmms_stat);

$xmms->signal_playback_playtime->notifier_set(\&xmms_playtime);


# консоль
=c
my $stdin_hdl = AnyEvent::Handle->new(fh => \*STDIN, on_read => sub {
	shift->push_read(sub {
		run_command($_[0]->{rbuf}, 1);
		undef $_[0]->{rbuf};
	});
});
=cut



for my $plugin (glob $ENV{'BASE'}.'perlophone-*.pm') {
	require $plugin;
}



$cmds->{$s->{mode}}->($s->{mode_input}) if $s->{mode} && $s->{mode_input};


my $w = AnyEvent->timer(after => 60, interval => 60*30, cb => sub {
	cleanMusicDir();
});


AE::cv->recv();

