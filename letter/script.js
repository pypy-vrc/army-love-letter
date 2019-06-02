$(function($) {
	$.ajaxSetup({
		cache: false,
		error: function() {
			alert('오류가 발생하였습니다. 잠시 후 다시 시도해주세요.');
		}
	});
	
	var escape_html_ = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;'
	};
	
	var escape_html = function(s) {
		return (s || '').replace(/[&<>]/g, function (s) {
			return escape_html_[s];
		});
	};
	
	var _token = '';
	var _offset = 0;
	
	//
	// 편지 쓰기
	//
	
	$('form.write').on('submit', function() {
		var $this = $(this);
		if ($this.find('[name=text]').val().trim()) {
			$this.find('[type=submit]').attr('disabled', 'disabled');
			$.ajax({
				method: 'POST',
				url: '/post',
				data: $(this).serialize(),
				success: function() {
					alert('접수 완료!!');
				},
				complete: function() {
					$this.find('[type=submit]').removeAttr('disabled');
				}
			});
		} else {
			alert('내용을 적어주세요..');
		}
		return false;
	});

	
	//
	// 편지 읽기
	//
	
	function fetch() {
		$.ajax({
			method: 'POST',
			url: '/posts',
			data: {
				token: _token,
				offset: _offset
			},
			success: function(data) {
				$('.posts').text(data.total);
				var html = [];
				var pages = ~~((data.total + 9) / 10);
				var page = ~~(data.offset / 10);
				for (var i = 0; i < pages; ++i) {
					var row = data.rows[i];
					html.push([
						'<li class="page-item', (i == page) ? ' active' : '', '">',
							'<a class="page-link" href="javascript:;" data-offset="', i * 10, '">',
								i + 1,
							'</a>',
						'</li>'
					].join(''));
				}
				$('#pagination').html(html.join(''));
				html.length = 0;
				for (var i = 0; i < data.rows.length; ++i) {
					var row = data.rows[i];
					html.push([
						'<div class="card mb-2">',
							'<div class="card-body">',
								'<h5 class="card-title">닉네임: ', escape_html(row.nick || '익명'), '</h5>',
								'<h6 class="card-subtitle mb-2 text-muted">', escape_html(row.at), ' (', escape_html(row.ip), ')</h6>',
								'<p class="card-text">', escape_html(row.text), '</p>',
							'</div>',
						'</div>'
					].join(''));
				}
				$('#posts').html(html.join(''));
			}
		});
	}
	
	$('#pagination').on('click', 'a[data-offset]', function() {
		_offset = $(this).attr('data-offset');
		fetch();
	});
	
	$('#refresh').on('click', fetch);
	
	//
	// 관리자 로그인
	//
	
	$('form.login').on('submit', function() {
		var $this = $(this);
		$this.find('[type=submit]').attr('disabled', 'disabled');
		$.ajax({
			method: 'POST',
			url: '/login',
			data: $(this).serialize(),
			success: function(data) {
				if (data.token) {
					_token = data.token;
					$('.page').addClass('d-none').filter('.read').removeClass('d-none');
					fetch();
				} else {
					alert('뒤지실?');
				}
			},
			complete: function() {
				$this.find('[type=submit]').removeAttr('disabled');
			}
		});
		return false;
	});
	
	$('a.login').on('click', function() {
		$('.page').addClass('d-none').filter('.login').removeClass('d-none');
	});
	
	//
	// 국방부 타이머
	//
	
	(function() {
		var now = new Date();
		$('.counter').each(function() {
			var time = (new Date($(this).attr('data-expire')) - now) / 1000;
			if (time < 0) {
				time = 0;
			}
			var $this = $(this);
			$this.find('.days').text(~~(time / 86400));
			$this.find('.hours').text(~~((time % 86400) / 3600));
			$this.find('.minutes').text(~~((time % 3600) / 60));
			$this.find('.seconds').text(~~(time % 60));
		});
		setTimeout(arguments.callee, 1000);
	})();
});