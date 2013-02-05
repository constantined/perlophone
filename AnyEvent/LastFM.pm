package AnyEvent::LastFM;
use AnyEvent::HTTP;
use JSON::XS 'decode_json';
use URI;

our $VERSION = '1.0';

my $ROOT = 'https://ws.audioscrobbler.com/2.0/';

sub new {
	my ($class, %args) = @_;
	bless \%args, $class;
}

sub request {
	my $cb = pop;
	my ($self, %args) = @_;

	$args{format} = 'json';
	$args{api_key} = $self->{api_key};

	my $uri = URI->new($ROOT);
	$uri->query_form(\%args);

	print $uri->as_string(), "\n";
	my $req; $req = http_get $uri->as_string(), sub {
		$cb->(decode_json($_[0] or '{}'));
		undef $req;
	};
}


1;
