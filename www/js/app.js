/**
 * Copyright 2013 Kinvey, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global $: true, Kinvey: true */
(function() {
  'use strict';

  // Setup.
  // ------

  // Initialize Kinvey.
  var promise = Kinvey.init({
    appKey    : 'kid_TPJbMF7m0O',
    appSecret : 'a12dbdc3d8ca4811b7ad63bf8bbe2602',
    sync      : { enable: true, online: navigator.onLine }
  }).then(function(activeUser) {
    // Auto-generate the active user if not defined.
    if(null === activeUser) {
      return Kinvey.User.create();
    }
  }).then(null, function(error) {
    status.trigger('error', error);
  });
  
  
  
  var form = $('#upload');
  form.on('submit', function(e) {
        e.preventDefault();
        alert("hello");
		// Upload all the submitted files in parallel.
        var uploads  = [];
        var fileList = document.getElementsById('fileupload').files;
        for(var i = 0, length = fileList.length; i < length; i += 1) {
            var file = fileList.item(i);
            uploads.push(Kinvey.File.upload(file));			
        }
        // Wait until all files are uploaded.
        var promise = Kinvey.Defer.all(uploads);
        promise.then(function(response) {
            alert("success");
			alert(response.length);
			// response is an Array of file metadata as returned by Kinvey.
			for(var i = 0,length=response.length;i < length; i++) {
				alert("hello");
				var name = response[i]._filename;
				var id   = response[i]._id;
				
				Kinvey.File.stream(id, {
					success: function(file) {
						alert(file._downloadURL);
						alert(file._downloadURL);
					}	
				});//*/
				alert(":"+name);
			}
        }, function(error) {
		    alert("error");
            // One or more uploads failed.
        });
   });
  
  
  // On/offline hooks.
  document.addEventListener('offline', Kinvey.Sync.offline);
  document.addEventListener('online', function() {
    status.trigger('loading', 'Synchronizing…');
    Kinvey.Sync.online().then(function() {
      status.trigger('success');
    }, function(error) {
      status.trigger('error', error);
    });
  });

  // Preseed data.
  promise.then(function() {
    list.trigger('update');
  });

  // Status.
  var status = $('#status');
  status.on({
    error: function(e, data) {
      var message = data instanceof Error ? data.message : data.description;
      status.html(message).removeClass('alert-info alert-success').addClass('alert-danger');
    },
    loading: function(e, text) {
      status.html(text || 'Loading…').removeClass('alert-danger alert-success').addClass('alert-info');
    },
    success: function(e, text) {
      status.html(text || 'OK.').removeClass('alert-danger alert-info').addClass('alert-success');
    }
  });

 
  // Add.
  // ----
  var add = $('#add');
  add.on('submit', function(e) {
    var button = add.find('button').attr('disabled', 'disabled');// Update UI.

    // Retrieve the form data.
    var data = { };
    add.serializeArray().forEach(function(input) {
      data[input.name] = input.value;
    });

    // Add the book.
    status.trigger('loading');
    Kinvey.DataStore.save('books', data).then(function() {
      list.trigger('update');
    }, function(error) {
      status.trigger('error', error);
    }).then(function() {
      // Restore UI.
      add.trigger('reset');
      button.removeAttr('disabled');
    });

    e.preventDefault();// Stop submit.
  });

  // List.
  var list = $('#list');
  var tpl  = $('#row-template').clone();
  list.on('update', function(e, query) {
    status.trigger('loading');
    Kinvey.DataStore.find('books', query).then(function(books) {
      // Update UI.
      var content = books.map(function(book, index) {
        var node = tpl.clone();

        // Update data.
        node.find('[data-placeholder="index"]').text(index + 1);
        node.find('[data-placeholder="title"]').text(book.title);
        node.find('[data-placeholder="author"]').text(book.author);
        node.find('button').attr('data-book', book._id);

        return node.html();
      });
      list.find('tbody').removeClass('hide').html(content);

      status.trigger('success');
    }, function(error) {
      status.trigger('error', error);
    });
  });

  // Filter.
  var filter = $('#filter');
  filter.on('submit', function(e) {
    // Retrieve the form data.
    var data = { };
    filter.serializeArray().forEach(function(input) {
      data[input.name] = input.value;
    });

    // Build the query.
    var query = new Kinvey.Query().ascending(data.sort);
    if('' !== data.search) {
      // Offline database does not support the regex query operator. Fallback to
      // equalTo.
      var method = Kinvey.Sync.isOnline() ? 'matches' : 'equalTo';
      query[method]('title',  data.search, { ignoreCase: true }).or()
           [method]('author', data.search, { ignoreCase: true });
    }
    if('' !== data.limit) {
      query.limit(data.limit);
    }
    list.trigger('update', query);

    e.preventDefault();// Stop submit.
  });

  // Destroy.
  list.on('click', '[data-action="shred"]', function() {
    var button = $(this).attr('disabled', 'disabled');
    var book   = button.data('book');

    // Remove the book.
    Kinvey.DataStore.destroy('books', book).then(function() {
      list.trigger('update');
    }, function(error) {
      // Restore UI.
      button.removeAttr('disabled');
      status.trigger('error', error);
    });
  });

}());