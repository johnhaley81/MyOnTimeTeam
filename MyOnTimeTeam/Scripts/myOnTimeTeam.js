(function (window, document, $) {
	window.myOnTimeTeam = {
		refreshData: function(viewModel) {
			this.getUsersData().then(function(response) {
				if (!response || !response.data)
					return;
				
				var users = response.data;

				for (var i = 0, l = users.length; i < l; i++) {
					$.when(window.myOnTimeTeam.getItemDetailsForUser('defects', users[i].id)
							, window.myOnTimeTeam.getItemDetailsForUser('features', users[i].id)
							, window.myOnTimeTeam.getItemDetailsForUser('incidents', users[i].id))
						.done(function (defects, features, incidents) {
							// Update the data for this user in the viewModel knockout object
							debugger;
						});
				}
			});
		},

		getCurrentUserData: function () {
			return $.ajax(this.getApiUrl('users/me'), {});
		},

		getUsersData: function() {
			return $.ajax(this.getApiUrl('users') + '&include_inactive=false', {});
		},

		getItemDetailsForUser: function (itemType, userId) {
			return $.ajax(this.getApiUrl(itemType) + '&page=1&page_size=1&group_field=assigned_to_name&columns=id&user_id=' + userId, {});
		},

		getApiUrl: function (route) {
			return '/ontime/proxy?resource=' + route;
		}
	};
}(window, document, jQuery));