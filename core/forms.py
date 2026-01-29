from django import forms

class UploadFileForm(forms.Form):
    file = forms.FileField(label='Upload an image or PDF')
