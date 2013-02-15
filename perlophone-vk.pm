use strict; use warnings; use utf8; use feature 'say';
use AnyEvent::HTTP;
use JSON::XS 'decode_json';
use URI;
use Data::Dumper;

my $app_id = '3407826'; #ID приложения perlophone
my $count = 300; #Сколько возвращать результатов

our ($s);

unless ( exists $s->{vk_access_token} ) {
	say color('BOLD RED'), 'Перейдите по адресу и введите параметр access_token в консоль:';
	say 'https://oauth.vk.com/authorize?client_id='.$app_id.
		'&scope=audio,offline&response_type=token', color('RESET');
	chomp($s->{vk_access_token} = <STDIN>);
	loadSaveSettings();
}
my $uri = URI->new('https://api.vk.com/method/audio.search');


addEvent('find_file', sub {
	my ($arg) = @_;
	$arg->{artist} =~ s#é#e#g; my $artist = canonical_s($arg->{artist});
	my $title = canonical_s($arg->{title});
	$uri->query_form({
		access_token => $s->{vk_access_token},
		q => $artist.' - '.$title,
		sort => 2,
		count => $count
	});
	#say $uri->as_string();
	http_get $uri->as_string(), headers => {'Referer' => undef},  sub {
		unless ( $_[0] ) {
			warn 'vk.com returned an empty response';
		}
		my $json = decode_json($_[0] =~ s#&amp;#&#gr);
		shift $json->{response};
		my @found;
		for my $song ( @{$json->{response}} ) {
			#print Dumper $song;
			if (canonical_s($song->{artist} or '') eq $artist
			  && canonical_s($song->{title} or '') eq $title ) {
				push @found, $song->{url};
			}
		}
		fireEvent('file_found', {%{$arg}, urls => [@found]});
	};
});










