#include <stdio.h>

void main(void){
    int n;
    scanf_s("%d",&n);
    list a = [n];
    for(int i = 0; i<n; i++)
        scanf_s("%d", &a[i]);
    int min, s;
    for(int i = 0; i<n; i++)
        min = a[0];
        for(int j = 0; j<n-i-1; j++)
            if(a[j] < a[j+1])
                s = a[j];
                a[j] = a[j+1];
                a[j+1] = s;

    for(int i = 0; i<n; i++)
    printf("%d", a[i]);

}

    